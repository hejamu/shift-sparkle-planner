import { useState } from "react";
import { useUserRole } from "@/hooks/use-user";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

interface AssignShiftDialogProps {
  children: React.ReactNode;
  employees: { id: string | number; name: string; role: string }[];
  currentAssignment: number | null;
  onAssign: (employeeId: number | null) => Promise<void> | void;
}

const AssignShiftDialog = ({ children, employees, currentAssignment, onAssign }: AssignShiftDialogProps) => {
  const [open, setOpen] = useState(false);
  const role = useUserRole();
  const { t } = useTranslation();
  const canAssign = role === "manager" || role === "admin";
  const form = useForm<{ employee: string } | any>({
    defaultValues: {
      employee: currentAssignment == null ? "unassigned" : String(currentAssignment),
    },
  });

  const onSubmit = async (data: { employee: string }) => {
    const value = data.employee;
    const employeeId = !value || value.toLowerCase() === "unassigned" ? null : Number(value);
    await onAssign(employeeId);
    setOpen(false);
  };

  if (!canAssign) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("assignShift")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="employee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("employee")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("selectEmployee")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="unassigned">{t("unassigned")}</SelectItem>
                      {employees.map((emp) => (
                        <SelectItem key={String(emp.id)} value={String(emp.id)}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
              <Button type="submit">{t("save")}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AssignShiftDialog;
