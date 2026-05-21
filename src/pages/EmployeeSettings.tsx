import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchEmployees, setEmployeeActiveState } from "@/lib/employeeApi";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/layout/Header";
import { useTranslation } from "react-i18next";

const EmployeeSettings = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: fetchEmployees,
  });

  const mutation = useMutation({
    mutationFn: (params: { id: number; active: boolean }) => setEmployeeActiveState(params.id, params.active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  return (
    <>
      <Header />
      <div className="max-w-2xl mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>{t("employeeActiveState")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div>{t("loading")}</div>
            ) : (
              <ul className="space-y-4">
                {employees.map((emp) => (
                  <li key={emp.id} className="flex items-center justify-between">
                    <span>{emp.name}</span>
                    <Switch
                      checked={!!emp.active}
                      onCheckedChange={(checked) => mutation.mutate({ id: emp.id, active: checked })}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default EmployeeSettings;
