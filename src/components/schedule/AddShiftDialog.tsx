import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Calendar, Clock, User, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const shiftSchema = z.object({
  employee: z.string().min(1, "Please select an employee"),
  date: z.string().min(1, "Please select a date"),
  startTime: z.string().min(1, "Please select start time"),
  endTime: z.string().min(1, "Please select end time"),
  role: z.string().min(1, "Please select a role"),
  location: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => {
  // Validate that end time is after start time
  if (data.startTime && data.endTime) {
    const start = new Date(`2000-01-01T${data.startTime}`);
    const end = new Date(`2000-01-01T${data.endTime}`);
    return end > start;
  }
  return true;
}, {
  message: "End time must be after start time",
  path: ["endTime"],
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
  
  const form = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      employee: "",
      date: selectedDate ? selectedDate.toISOString().split('T')[0] : "",
      startTime: "",
      endTime: "",
      role: "",
      location: "",
      notes: "",
    },
  });

  // Sample employees data
  const employees = [
    { id: "1", name: "Sarah Johnson", role: "Manager" },
    { id: "2", name: "Mike Chen", role: "Sales Associate" },
    { id: "3", name: "Emily Davis", role: "Cashier" },
    { id: "4", name: "David Wilson", role: "Stock Associate" },
    { id: "5", name: "Lisa Brown", role: "Cashier" },
    { id: "6", name: "John Smith", role: "Security" },
    { id: "7", name: "Anna Garcia", role: "Customer Service" },
  ];

  const roles = [
    "Manager",
    "Assistant Manager", 
    "Sales Associate",
    "Cashier",
    "Stock Associate",
    "Customer Service",
    "Security",
    "Maintenance",
  ];

  const locations = [
    "Front Desk",
    "Sales Floor",
    "Register 1",
    "Register 2", 
    "Register 3",
    "Warehouse",
    "Customer Service",
    "Security Desk",
    "Stock Room",
  ];

  // Generate time options (30-minute intervals)
  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = i % 2 === 0 ? "00" : "30";
    const time = `${hour.toString().padStart(2, "0")}:${minute}`;
    const displayTime = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return { value: time, label: displayTime };
  });

  const onSubmit = (data: ShiftFormData) => {
    onShiftAdded(data);
    toast({
      title: "Shift Added Successfully",
      description: `Shift for ${employees.find(e => e.id === data.employee)?.name} has been created.`,
    });
    form.reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span>Add New Shift</span>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="employee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center space-x-1">
                      <User className="h-4 w-4" />
                      <span>Employee</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name}
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
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>Start Time</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Start time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-60">
                        {timeOptions.map((time) => (
                          <SelectItem key={time.value} value={time.value}>
                            {time.label}
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
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="End time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-60">
                        {timeOptions.map((time) => (
                          <SelectItem key={time.value} value={time.value}>
                            {time.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
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
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span>Location</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional notes about this shift..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="hero">
                Add Shift
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddShiftDialog;