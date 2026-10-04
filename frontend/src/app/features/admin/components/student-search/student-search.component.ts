import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';
import { AdminStudentRecord, AdminStudentView } from '../../../../core/models/admin.model';
import { AdminService, toMAndEStatus } from '../../../../core/services/admin.service';
import { NO_VALUE_PLACEHOLDER } from '../../../../core/utils/format.utils';
import { UiBadgeComponent } from '../../../../shared/components/ui-badge/ui-badge.component';
import { UiIconComponent } from '../../../../shared/components/ui-icon/ui-icon.component';

/** Pause after the last keystroke before we hit the API. */
const SEARCH_DEBOUNCE_MS = 300;

/** Below this length the query is too broad to be a useful admin search. */
const MIN_QUERY_LENGTH = 2;

/** How many hits the dropdown shows before asking the user to refine. */
const MAX_RESULTS = 8;

/** One emission of the search stream: the hits plus whether a request is open. */
interface SearchState {
  matches: AdminStudentView[];
  loading: boolean;
  /** Echo of the query the results belong to, so stale rows never flash. */
  term: string;
}

/**
 * Global student search for the admin control tower.
 *
 * Searching runs through a `FormControl` piped into
 * `debounceTime(300) → distinctUntilChanged → switchMap`, which gives two
 * things a plain `valueChanges` subscription cannot: one request per settled
 * keystroke instead of per character, and cancellation of the in-flight
 * request whenever a newer keystroke arrives — so a slow early response can
 * never overwrite the results for what the user actually typed.
 *
 * The dropdown matches on **Student ID or Student Name** and opens the edit
 * modal directly, so an administrator can find and fix a record without first
 * navigating the School → Class hierarchy.
 */
@Component({
  selector: 'app-student-search',
  standalone: true,
  imports: [ReactiveFormsModule, UiBadgeComponent, UiIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './student-search.component.html',
})
export class StudentSearchComponent {
  private readonly admin = inject(AdminService);

  /** Emits the chosen student so the page can open its edit modal. */
  readonly studentPicked = output<AdminStudentView>();

  readonly query = new FormControl('', { nonNullable: true });

  private readonly state = toSignal(
    this.query.valueChanges.pipe(
      map((term) => term.trim()),
      debounceTime(SEARCH_DEBOUNCE_MS),
      distinctUntilChanged(),
      switchMap((term) =>
        term.length < MIN_QUERY_LENGTH
          ? of<SearchState>({ matches: [], loading: false, term })
          : this.admin.getStudents({ schoolId: null, classId: null, search: term }).pipe(
              map((records) => ({
                matches: records
                  .slice(0, MAX_RESULTS)
                  .map((record) => toStudentView(record, null)),
                loading: false,
                term,
              })),
              // A failed lookup must not break the page; the dropdown just empties.
              catchError(() => of<SearchState>({ matches: [], loading: false, term }))
            )
      ),
      startWith<SearchState>({ matches: [], loading: false, term: '' })
    ),
    { initialValue: { matches: [], loading: false, term: '' } as SearchState }
  );

  /** Hits for the current query; empty when the query is too short to search. */
  readonly matches = computed(() => this.state().matches);
  readonly searching = computed(() => this.state().loading);

  /**
   * True only while the dropdown should be visible. `dismissed` is what stops
   * the list re-opening the instant a result is picked, since clearing the box
   * would otherwise re-trigger the stream.
   */
  readonly dropdownOpen = computed(
    () => this.state().term.length >= MIN_QUERY_LENGTH && !this.dismissed()
  );

  /** Set when the user picks or clears, so the list does not immediately re-open. */
  private readonly dismissed = signal(false);

  pick(student: AdminStudentView): void {
    this.studentPicked.emit(student);
    this.clear();
  }

  clear(): void {
    this.dismissed.set(true);
    this.query.setValue('', { emitEvent: true });
  }

  /** Called on input so typing again re-opens the dropdown after a dismissal. */
  onQueryChanged(): void {
    this.dismissed.set(false);
  }
}

/**
 * Projects a raw API record into the display shape shared by the search
 * dropdown, the table and the profile card, so all three agree on a student's
 * name, class and status.
 */
export function toStudentView(
  record: AdminStudentRecord,
  parent: { parentName: string; relation: string | null } | null
): AdminStudentView {
  return {
    record,
    studentIdCode: record.studentIdCode,
    fullName: `${record.firstName} ${record.lastName}`.trim(),
    classLabel: record.className ?? record.currentEnrollment?.className ?? NO_VALUE_PLACEHOLDER,
    status: record.status,
    mAndEStatus: toMAndEStatus(record),
    parentName: parent?.parentName ?? null,
    parentRelation: parent?.relation ?? null,
    phone: record.phone ?? record.contactNumber ?? null,
  };
}