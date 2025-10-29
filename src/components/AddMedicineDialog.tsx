import { useState } from "react";
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

interface AddMedicineDialogProps {
  onAdd: (medicine: Omit<Medicine, 'id' | 'createdAt'>) => void;
  editMedicine?: Medicine;
  onUpdate?: (id: string, updates: Partial<Medicine>) => void;
}

export const AddMedicineDialog = ({ onAdd, editMedicine, onUpdate }: AddMedicineDialogProps) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editMedicine && onUpdate) {
      onUpdate(editMedicine.id, {
        name,
        totalStock: parseInt(totalStock),
        currentStock: parseInt(currentStock),
        dosage,
        notes,
      });
    } else {
      onAdd({
        name,
        totalStock: parseInt(totalStock),
        currentStock: parseInt(currentStock),
        dosage,
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
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
