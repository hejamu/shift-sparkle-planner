import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import ConfirmDialog from '../ConfirmDialog';
import { renderWithProviders } from '@/__tests__/test-utils';

describe('ConfirmDialog', () => {
  it('does not render the dialog content until the trigger is clicked', () => {
    renderWithProviders(
      <ConfirmDialog
        trigger={<button>Delete</button>}
        title="Delete this?"
        description="Goodbye forever."
        onConfirm={() => undefined}
      />,
    );
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.queryByText('Goodbye forever.')).not.toBeInTheDocument();
  });

  it('shows title + description after opening, and calls onConfirm exactly once on confirm', async () => {
    const onConfirm = vi.fn();
    renderWithProviders(
      <ConfirmDialog
        trigger={<button>Delete</button>}
        title="Delete this?"
        description="Goodbye forever."
        confirmLabel="Yes, delete"
        onConfirm={onConfirm}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Delete this?')).toBeInTheDocument();
    expect(screen.getByText('Goodbye forever.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Yes, delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('does not call onConfirm when the user cancels', async () => {
    const onConfirm = vi.fn();
    renderWithProviders(
      <ConfirmDialog
        trigger={<button>Delete</button>}
        title="Delete this?"
        onConfirm={onConfirm}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(await screen.findByRole('button', { name: /cancel/i }));
    expect(onConfirm).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText('Delete this?')).not.toBeInTheDocument());
  });

  it('disables the confirm button while the onConfirm promise is in flight', async () => {
    let resolve: () => void = () => undefined;
    const onConfirm = vi.fn(() => new Promise<void>((r) => { resolve = r; }));
    renderWithProviders(
      <ConfirmDialog
        trigger={<button>Delete</button>}
        title="Delete this?"
        confirmLabel="Yes"
        onConfirm={onConfirm}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const confirmBtn = await screen.findByRole('button', { name: 'Yes' });
    await user.click(confirmBtn);
    await waitFor(() => expect(confirmBtn).toBeDisabled());
    resolve();
    await waitFor(() => expect(screen.queryByText('Delete this?')).not.toBeInTheDocument());
  });
});
