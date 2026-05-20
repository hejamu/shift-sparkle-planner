import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const shiftSchema = z.object({
  employee: z.string().optional(),
  date: z.string().min(1, "Please select a date"),
  time: z.string().min(1, "Please select shift start time"),
  end_time: z.string().min(1, "Please select shift end time"),
  shiftType: z.string().min(1, "Please select a shift type"),
  notes: z.string().optional(),
});

type ShiftFormData = z.infer<typeof shiftSchema>;

interface AddShiftDialogProps {
  children: React.ReactNode;
  selectedDate?: Date;
  onShiftAdded: (shift: ShiftFormData) => void;
}


const AddShiftDialog = ({ children, selectedDate, onShiftAdded }: AddShiftDialogProps) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  // Dynamic employees, roles
  const [employees, setEmployees] = useState<{ id: string; name: string; role: string }[]>([]);
  const [shiftTypes, setShiftTypes] = useState<{ id: string; name: string; color: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Time options for select (every 30 min from 06:00 to 22:00)
  const timeOptions = Array.from({ length: 33 }, (_, i) => {
    const hour = Math.floor((i * 30) / 60) + 6;
    const min = (i * 30) % 60;
    const value = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
    return { value, label: value };
  });

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const empRes = await fetch("/api/employees");
        if (!empRes.ok) throw new Error("Failed to fetch employees");
        const empData = await empRes.json();
        setEmployees(empData);
  const shiftTypeRes = await fetch("/api/shift-types");
  if (!shiftTypeRes.ok) throw new Error("Failed to fetch shift types");
  const shiftTypeData = await shiftTypeRes.json();
  setShiftTypes(shiftTypeData);
      } catch (err: any) {
        setError(err.message || "Failed to load data");
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const form = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
  employee: "unassigned",
      date: selectedDate ? selectedDate.toISOString().split('T')[0] : "",
  time: "",
  end_time: "",
  shiftType: "",
  notes: "",
    },
  });

  const onSubmit = (data: ShiftFormData) => {
  onShiftAdded(data);
    toast({ title: t("shiftCreated"), description: t("shiftCreatedDesc") });
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span>{t("addNewShift")}</span>
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">{t("loading")}</div>
        ) : error ? (
          <div className="py-8 text-center text-destructive font-semibold">Error: {error}</div>
        ) : (
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
                        {employees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("date")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("time")}</FormLabel>
                    <div className="flex gap-2">
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("start")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timeOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormField
                        control={form.control}
                        name="end_time"
                        render={({ field: endField }) => (
                          <FormItem>
                            <Select onValueChange={endField.onChange} value={endField.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t("end")} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {timeOptions.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shiftType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("shiftType")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("selectShiftType")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {shiftTypes.map(st => (
                          <SelectItem key={st.id} value={st.id}>
                            <span style={{ background: st.color, color: '#fff', padding: '2px 8px', borderRadius: '4px' }}>{st.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("notes")}</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder={t("optionalNotes")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">{t("addShift")}</Button>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddShiftDialog;