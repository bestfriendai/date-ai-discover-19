
import { useEffect, useState } from 'react';
import { getItineraries, updateItinerary } from '@/services/itineraryService';
import type { Itinerary, Event } from '@/types';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface AddToPlanModalProps {
  event: Event;
  open: boolean;
  onClose: () => void;
}

const AddToPlanModal = ({ event, open, onClose }: AddToPlanModalProps) => {
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      getItineraries().then(setItineraries);
    }
  }, [open]);

  const handleAdd = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const itinerary = itineraries.find(i => i.id === selectedId);
      if (!itinerary) throw new Error('Itinerary not found');
      // Prevent duplicate event in itinerary
      if (itinerary.items.some(item => item.eventId === event.id)) {
        toast({ title: 'Already in Plan', description: 'This event is already in the selected itinerary.' });
        setLoading(false);
        return;
      }
      const newItem = {
        id: `new-${Date.now()}`,
        eventId: event.id,
        title: event.title,
        description: event.description,
        startTime: event.time,
        endTime: event.time,
        location: event.location,
        coordinates: event.coordinates,
        notes: '',
        type: "EVENT" as const,
        order: itinerary.items.length,
      };
      const updated = { ...itinerary, items: [...itinerary.items, newItem] };
      await updateItinerary(itinerary.id, { items: updated.items });
      toast({ title: 'Added to Plan', description: `Added to "${itinerary.name}"` });
      onClose();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add to itinerary', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-to-plan-title"
      tabIndex={-1}
    >
      <div className="bg-[hsl(var(--sidebar-background))] border border-[hsl(var(--sidebar-border))] rounded-xl shadow-2xl p-8 w-full max-w-md focus:outline-none"
        tabIndex={0}
      >
        <h2 id="add-to-plan-title" className="text-xl font-bold mb-6 text-[hsl(var(--sidebar-primary))]">Add to Plan</h2>
        <div className="mb-6">
          {itineraries.length === 0 ? (
            <p className="text-[hsl(var(--sidebar-foreground))]/70">No itineraries found. Create one first.</p>
          ) : (
            <select
              className="w-full border border-[hsl(var(--sidebar-border))] rounded-md px-3 py-2 mb-2 bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sidebar-ring))] transition"
              value={selectedId || ''}
              onChange={e => setSelectedId(e.target.value)}
              aria-label="Select an itinerary"
              disabled={loading}
            >
              <option value="" disabled>Select an itinerary</option>
              {itineraries.map(it => (
                <option key={it.id} value={it.id}>{it.name} ({it.date})</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="border-[hsl(var(--sidebar-border))] text-[hsl(var(--sidebar-primary))] hover:bg-[hsl(var(--sidebar-accent))]/60 transition"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedId || loading}
            className="bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))] hover:bg-[hsl(var(--sidebar-primary))]/90 transition"
          >
            {loading ? 'Adding...' : 'Add to Plan'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddToPlanModal;
