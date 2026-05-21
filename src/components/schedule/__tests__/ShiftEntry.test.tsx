import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, within } from '@testing-library/react';
import ShiftEntry from '../ShiftEntry';
import type { LaidOutShift, ShiftType } from '@/lib/shiftLayout';
import type { EmployeeApi } from '@/lib/employeeApi';
import type { ShiftApplication } from '@/lib/shiftApplicationApi';
import { renderWithProviders } from '@/__tests__/test-utils';

const SHIFT_TYPES: ShiftType[] = [{ id: 1, name: 'Morning', color: '#ff0000' }];

const EMPLOYEES: EmployeeApi[] = [
  { id: 1, name: 'Alice', role: 'employee' },
  { id: 2, name: 'Bob', role: 'employee' },
];

const baseShift = (over: Partial<LaidOutShift> = {}): LaidOutShift => ({
  id: 42,
  employee: null,
  date: '2026-05-21',
  start_time: '09:00',
  end_time: '17:00',
  shift_type: 1,
  day: 0,
  time: '09:00',
  duration: 8,
  color: '#ff0000',
  startMinutes: 540,
  endMinutes: 1020,
  colIndex: 0,
  colCount: 1,
  ...over,
});

const baseProps = (over: Partial<React.ComponentProps<typeof ShiftEntry>> = {}) => ({
  shift: baseShift(),
  top: 0,
  height: 96,
  isOpen: true, // open by default so the dialog body is queryable
  onOpenChange: vi.fn(),
  isMyShift: false,
  assignedName: null as string | null,
  shiftTypes: SHIFT_TYPES,
  employees: EMPLOYEES,
  role: 'employee' as const,
  shiftApplications: [] as ShiftApplication[],
  myApplication: undefined as ShiftApplication | undefined,
  applyLoading: false,
  applySuccess: false,
  wasAutoAssigned: false,
  applyError: null as string | null,
  onApply: vi.fn(),
  onDelete: vi.fn(),
  onAssign: vi.fn(),
  getEmployeeName: (id: string | number) => EMPLOYEES.find((e) => String(e.id) === String(id))?.name ?? 'Unknown',
  ...over,
});

describe('ShiftEntry — employee view', () => {
  it('shows the Apply button on an unassigned shift', () => {
    renderWithProviders(<ShiftEntry {...baseProps()} />);
    expect(screen.getByRole('button', { name: /apply for shift/i })).toBeInTheDocument();
  });

  it('shows "Application pending" when the user already has a pending application', () => {
    renderWithProviders(
      <ShiftEntry
        {...baseProps({
          myApplication: { id: 1, shift_id: 42, employee_id: 1, status: 'pending', auto_assigned: 0, created_at: '' },
        })}
      />,
    );
    expect(screen.getByText(/application pending/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /apply for shift/i })).not.toBeInTheDocument();
  });

  it('shows the assigned-to-you indicator when this employee owns the shift', () => {
    renderWithProviders(
      <ShiftEntry
        {...baseProps({
          shift: baseShift({ employee: 1 }),
          assignedName: 'Alice',
          isMyShift: true,
          myApplication: { id: 1, shift_id: 42, employee_id: 1, status: 'approved', auto_assigned: 0, created_at: '' },
        })}
      />,
    );
    expect(screen.getByText(/assigned to you/i)).toBeInTheDocument();
  });

  it('flags an auto-assigned shift differently from a manual one', () => {
    renderWithProviders(
      <ShiftEntry
        {...baseProps({
          shift: baseShift({ employee: 1 }),
          assignedName: 'Alice',
          isMyShift: true,
          myApplication: { id: 1, shift_id: 42, employee_id: 1, status: 'approved', auto_assigned: 1, created_at: '' },
        })}
      />,
    );
    expect(screen.getByText(/auto-assigned to you/i)).toBeInTheDocument();
  });

  it('calls onApply with the shift id when the Apply button is clicked', async () => {
    const onApply = vi.fn();
    renderWithProviders(<ShiftEntry {...baseProps({ onApply })} />);
    await userEvent.setup().click(screen.getByRole('button', { name: /apply for shift/i }));
    expect(onApply).toHaveBeenCalledWith(42);
  });
});

describe('ShiftEntry — manager view', () => {
  const managerProps = (over = {}) => baseProps({ role: 'admin', ...over });

  it('renders pending applications with approve/reject buttons', () => {
    const pending: ShiftApplication = { id: 7, shift_id: 42, employee_id: 1, status: 'pending', auto_assigned: 0, created_at: '' };
    renderWithProviders(<ShiftEntry {...managerProps({ shiftApplications: [pending] })} />);
    // Alice from EMPLOYEES is the applicant
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
  });

  it('shows currently-assigned employee with an Unassign button, and Unassign calls onAssign(shift, null)', async () => {
    const onAssign = vi.fn();
    renderWithProviders(
      <ShiftEntry
        {...managerProps({
          shift: baseShift({ employee: 2 }),
          assignedName: 'Bob',
          onAssign,
        })}
      />,
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Bob')).toBeInTheDocument();
    await userEvent.setup().click(within(dialog).getByRole('button', { name: /unassign/i }));
    expect(onAssign).toHaveBeenCalledTimes(1);
    expect(onAssign.mock.calls[0][1]).toBeNull();
  });

  it('Delete is wrapped in a confirm dialog — first click opens it, then Confirm fires onDelete', async () => {
    const onDelete = vi.fn();
    renderWithProviders(<ShiftEntry {...managerProps({ onDelete })} />);
    const user = userEvent.setup();
    // There are two "Delete" texts after the confirm opens (button + confirm label),
    // so target the first by its role inside the dialog footer.
    const triggerBtn = screen.getAllByRole('button', { name: /delete/i })[0];
    await user.click(triggerBtn);
    // Confirm modal title is keyed and English-rendered via test i18n
    expect(await screen.findByText(/delete this shift/i)).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
    // Confirm button uses confirmLabel="Delete" (passed in ShiftEntry)
    const confirmBtns = screen.getAllByRole('button', { name: /delete/i });
    await user.click(confirmBtns[confirmBtns.length - 1]);
    expect(onDelete).toHaveBeenCalledWith(42);
  });
});
