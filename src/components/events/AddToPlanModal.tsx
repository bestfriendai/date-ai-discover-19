import { useEffect, useState } from 'react';
import { getUserItineraries, saveItinerary } from '@/services/itineraryService';
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
      getUserItineraries().then(setItineraries);
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
      };
      const updated = { ...itinerary, items: [...itinerary.items, newItem] };
      await saveItinerary(updated);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Add to Plan</h2>
        <div className="mb-4">
          {itineraries.length === 0 ? (
            <p className="text-muted-foreground">No itineraries found. Create one first.</p>
          ) : (
            <select
              className="w-full border rounded p-2 mb-2"
              value={selectedId || ''}
              onChange={e => setSelectedId(e.target.value)}
            >
              <option value="" disabled>Select an itinerary</option>
              {itineraries.map(it => (
                <option key={it.id} value={it.id}>{it.name} ({it.date})</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!selectedId || loading}>
            {loading ? 'Adding...' : 'Add to Plan'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddToPlanModal;