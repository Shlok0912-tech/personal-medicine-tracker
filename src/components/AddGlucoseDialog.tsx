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

interface AddGlucoseDialogProps {
  onAdd: (value: number, notes?: string) => void;
}

export const AddGlucoseDialog = ({ onAdd }: AddGlucoseDialogProps) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(parseInt(value), notes);
    setValue("");
    setNotes("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Reading
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Glucose Reading</DialogTitle>
          <DialogDescription>
            Add a new glucose measurement
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="value">Glucose Level (mg/dL)</Label>
            <Input
              id="value"
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g., 120"
              required
              min="1"
            />
            <p className="text-sm text-muted-foreground">
              Normal range: 70-140 mg/dL
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Before/after meal, symptoms, etc..."
              rows={3}
            />
          </div>
          
          <Button type="submit" className="w-full">
            Add Reading
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
