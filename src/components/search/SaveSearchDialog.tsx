import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Button,
  Input,
  Label,
} from '@/components/ui';
import { Save, Loader2 } from 'lucide-react';
import { trpc } from '@/utils/trpc';

interface SaveSearchDialogProps {
  query: string;
  source: string;
  filters: any;
  onSaved?: () => void;
}

export default function SaveSearchDialog({ query, source, filters, onSaved }: SaveSearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchTitle, setSearchTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  // tRPC mutation for saving search
  const saveSearchMutation = trpc.search.create.useMutation({
    onSuccess: () => {
      setOpen(false);
      setSearchTitle('');
      setError(null);
      if (onSaved) onSaved();
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleSave = async () => {
    if (!query) {
      setError('Cannot save an empty search query');
      return;
    }

    try {
      await saveSearchMutation.mutateAsync({
        query,
        source,
        filters,
        search_title: searchTitle || `Search: ${query.substring(0, 30)}...`,
        is_saved: true,
      });
    } catch (err) {
      // Error is handled in onError callback
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Save className="h-4 w-4" />
          Save Search
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save Search Strategy</DialogTitle>
          <DialogDescription>
            Save this search strategy to your account for future use.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="search-title" className="text-right">
              Title
            </Label>
            <Input
              id="search-title"
              placeholder="My Search Strategy"
              value={searchTitle}
              onChange={(e) => setSearchTitle(e.target.value)}
              className="col-span-3"
            />
          </div>
          {error && (
            <div className="text-red-500 text-sm mt-2">{error}</div>
          )}
        </div>
        <DialogFooter>
          <Button 
            type="submit" 
            onClick={handleSave}
            disabled={saveSearchMutation.isLoading}
          >
            {saveSearchMutation.isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Search'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
