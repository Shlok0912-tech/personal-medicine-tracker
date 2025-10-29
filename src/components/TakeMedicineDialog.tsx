import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Medicine } from "@/lib/storage";

interface TakeMedicineDialogProps {
  medicine: Medicine | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (quantity: number, notes?: string) => void;
}

export const TakeMedicineDialog = ({ medicine, open, onOpenChange, onConfirm }: TakeMedicineDialogProps) => {
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(parseInt(quantity), notes);
    setQuantity("1");
    setNotes("");
    onOpenChange(false);
  };

  if (!medicine) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Take {medicine.name}</DialogTitle>
          <DialogDescription>
            Record taking this medicine
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              max={medicine.currentStock}
              required
            />
            <p className="text-sm text-muted-foreground">
              Available: {medicine.currentStock}
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={3}
            />
          </div>
          
          <Button type="submit" className="w-full">
            Confirm
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
