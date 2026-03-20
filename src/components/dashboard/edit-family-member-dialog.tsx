'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { editFamilyMember } from '@/actions/family';
import { RELATIONSHIPS, RELATIONSHIP_LABELS, type RelationshipValue } from '@/lib/validators/family.schema';
import { Pencil } from 'lucide-react';

interface EditFamilyMemberDialogProps {
  member: {
    id: string;
    name: string;
    relationship: string | null;
  };
}

export function EditFamilyMemberDialog({ member }: EditFamilyMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(member.name);
  const [relationship, setRelationship] = useState<RelationshipValue | ''>(
    (member.relationship as RelationshipValue) ?? ''
  );

  function resetForm() {
    setName(member.name);
    setRelationship((member.relationship as RelationshipValue) ?? '');
    setError(null);
  }

  function handleSubmit() {
    setError(null);

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    startTransition(async () => {
      const result = await editFamilyMember({
        familyMemberId: member.id,
        name: name.trim(),
        ...(relationship ? { relationship } : { relationship: null }),
      });

      if (result.success) {
        setOpen(false);
      } else {
        setError(result.error ?? 'Unknown error');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (value) resetForm(); }}>
      <DialogTrigger render={<Button variant="ghost" size="icon" />}>
        <Pencil className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {member.name}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="edit-family-name">Name</Label>
            <Input
              id="edit-family-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-family-relationship">Relationship</Label>
            <Select
              value={relationship}
              onValueChange={(value) => setRelationship((value ?? '') as RelationshipValue | '')}
            >
              <SelectTrigger id="edit-family-relationship">
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIPS.map((rel) => (
                  <SelectItem key={rel} value={rel}>
                    {RELATIONSHIP_LABELS[rel]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
