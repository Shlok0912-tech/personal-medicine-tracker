import { Pill, Edit, Trash2 } from "lucide-react";
import { Medicine } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MedicineCardProps {
  medicine: Medicine;
  onTake: (medicine: Medicine) => void;
  onEdit: (medicine: Medicine) => void;
  onDelete: (id: string) => void;
}

export const MedicineCard = ({ medicine, onTake, onEdit, onDelete }: MedicineCardProps) => {
  const stockPercentage = (medicine.currentStock / medicine.totalStock) * 100;
  const isLowStock = stockPercentage < 20;
  
  return (
    <Card className="overflow-hidden transition-all hover:shadow-[var(--shadow-card)]">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Pill className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{medicine.name}</CardTitle>
              <CardDescription>{medicine.dosage}</CardDescription>
              {medicine.schedule && (
                <div className="mt-1">
                  <Badge variant="secondary">
                    {(
                      {
                        morning: 'Only Morning',
                        noon: 'Only Noon',
                        night: 'Only Night',
                        morning_noon: 'Morning & Noon',
                        morning_night: 'Morning & Night',
                        noon_night: 'Noon & Night',
                        three_times: '3 times',
                      } as const
                    )[medicine.schedule]}
                  </Badge>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => onEdit(medicine)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(medicine.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Stock</span>
            <Badge variant={isLowStock ? "destructive" : "secondary"}>
              {medicine.currentStock} / {medicine.totalStock}
            </Badge>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${isLowStock ? 'bg-destructive' : 'bg-primary'}`}
              style={{ width: `${Math.min(stockPercentage, 100)}%` }}
            />
          </div>
        </div>
        
        {medicine.notes && (
          <p className="text-sm text-muted-foreground">{medicine.notes}</p>
        )}
        
        <Button 
          className="w-full" 
          onClick={() => onTake(medicine)}
          disabled={medicine.currentStock === 0}
        >
          Take Medicine
        </Button>
      </CardContent>
    </Card>
  );
};
