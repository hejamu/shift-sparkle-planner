import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchShiftApplications, updateShiftApplicationStatus, ShiftApplication } from "@/lib/shiftApplicationApi";
import { updateShift, Shift } from "@/lib/shiftApi";

// Shared approve / reject logic for shift applications. Both the manager's
// "Applications" tab and the inline approver in the shift details dialog
// call this so the cascade (reject siblings on approve, etc.) stays in one
// place.
export function useShiftApplicationActions() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["shifts"] });
    queryClient.invalidateQueries({ queryKey: ["shift-applications"] });
    queryClient.invalidateQueries({ queryKey: ["my-applications"] });
  };

  const approve = useMutation({
    mutationFn: async ({ application, shift }: { application: ShiftApplication; shift: Shift }) => {
      // Assign the shift to the approved applicant.
      await updateShift(shift.id, { ...shift, employee: application.employee_id });
      // Mark this application approved.
      await updateShiftApplicationStatus(application.id, "approved");
      // Reject any other pending applications for the same shift.
      const others = await fetchShiftApplications(shift.id);
      await Promise.all(
        others
          .filter((a) => a.id !== application.id && a.status === "pending")
          .map((a) => updateShiftApplicationStatus(a.id, "rejected")),
      );
    },
    onSuccess: invalidate,
  });

  const reject = useMutation({
    mutationFn: (application: ShiftApplication) => updateShiftApplicationStatus(application.id, "rejected"),
    onSuccess: invalidate,
  });

  return { approve, reject };
}
