import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { Medicine } from "@/lib/storage";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddMedicineDialogProps {
  onAdd: (medicine: Omit<Medicine, 'id' | 'createdAt'>) => void;
  editMedicine?: Medicine;
  onUpdate?: (id: string, updates: Partial<Medicine>) => void;
  onClose?: () => void;
}

export const AddMedicineDialog = ({ onAdd, editMedicine, onUpdate, onClose }: AddMedicineDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(editMedicine?.name ?? "");
  const [totalStock, setTotalStock] = useState(
    editMedicine?.totalStock !== undefined ? String(editMedicine.totalStock) : ""
  );
  const [currentStock, setCurrentStock] = useState(
    editMedicine?.currentStock !== undefined ? String(editMedicine.currentStock) : ""
  );
  const [dosage, setDosage] = useState(editMedicine?.dosage ?? "");
  const [notes, setNotes] = useState(editMedicine?.notes ?? "");
  const [schedule, setSchedule] = useState<Medicine["schedule"]>(editMedicine?.schedule ?? undefined);

  // Open the dialog automatically when an edit target is provided
  useEffect(() => {
    if (editMedicine) {
      // Populate form with existing values when editing
      setName(editMedicine.name ?? "");
      setTotalStock(editMedicine.totalStock !== undefined ? String(editMedicine.totalStock) : "");
      setCurrentStock(editMedicine.currentStock !== undefined ? String(editMedicine.currentStock) : "");
      setDosage(editMedicine.dosage ?? "");
      setNotes(editMedicine.notes ?? "");
      setSchedule(editMedicine.schedule ?? undefined);
      setOpen(true);
    }
  }, [editMedicine]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editMedicine && onUpdate) {
      onUpdate(editMedicine.id, {
        name,
        totalStock: parseInt(totalStock),
        currentStock: parseInt(currentStock),
        dosage,
        schedule,
        notes,
      });
    } else {
      onAdd({
        name,
        totalStock: parseInt(totalStock),
        currentStock: parseInt(currentStock),
        dosage,
        schedule,
        notes,
      });
    }
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setName("");
    setTotalStock("");
    setCurrentStock("");
    setDosage("");
    setSchedule(undefined);
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o);
      if (o) {
        // If opening in add mode, clear stale edit values
        if (!editMedicine) {
          resetForm();
        }
      } else {
        if (editMedicine && onClose) onClose();
      }
    }}>
      <DialogTrigger asChild>
        {editMedicine ? (
          <Button variant="ghost" size="sm">Edit</Button>
        ) : (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Medicine
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editMedicine ? "Edit Medicine" : "Add New Medicine"}</DialogTitle>
          <DialogDescription>
            {editMedicine ? "Update medicine details" : "Add a new medicine to your inventory"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Medicine Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Aspirin"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalStock">Total Stock</Label>
              <Input
                id="totalStock"
                type="number"
                value={totalStock}
                onChange={(e) => setTotalStock(e.target.value)}
                placeholder="100"
                required
                min="1"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="currentStock">Current Stock</Label>
              <Input
                id="currentStock"
                type="number"
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
                placeholder="50"
                required
                min="0"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="dosage">Dosage</Label>
            <Input
              id="dosage"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="e.g., 500mg"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Schedule</Label>
            <Select value={schedule ?? undefined} onValueChange={(v) => setSchedule((v === '__none__' ? undefined : v) as Medicine["schedule"])}>
              <SelectTrigger>
                <SelectValue placeholder="Select schedule (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                <SelectItem value="morning">Only Morning</SelectItem>
                <SelectItem value="noon">Only Noon</SelectItem>
                <SelectItem value="night">Only Night</SelectItem>
                <SelectItem value="morning_noon">Morning and Noon</SelectItem>
                <SelectItem value="morning_night">Morning and Night</SelectItem>
                <SelectItem value="noon_night">Noon and Night</SelectItem>
              <SelectItem value="three_times">3 times</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>
          
          <Button type="submit" className="w-full">
            {editMedicine ? "Update Medicine" : "Add Medicine"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
