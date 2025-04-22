import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Itinerary, ItineraryItem } from '@/types';
import { getItinerary, updateItinerary, deleteItinerary } from '@/services/itineraryService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// Loader2 imported below with others
import errorReporter from '../utils/errorReporter';
import { useToast } from '../components/ui/use-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Loader2, Trash2, Calendar } from 'lucide-react'; // Import Loader2, Trash2, and Calendar

const EditItinerary: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false); // Add state for saving order
  const [editingName, setEditingName] = useState('');
  const [editingDate, setEditingDate] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (id) fetchItinerary(id);
  }, [id]);

  const fetchItinerary = async (itineraryId: string) => {
    setLoading(true);
    try {
      const data = await getItinerary(itineraryId);
      if (data) {
        // Normalize items to ensure eventId is always present
        const normalizedItems = (data.items || []).map(item => ({
          ...item,
          eventId: item.eventId ?? '',
        }));
        setItinerary({ ...data, items: normalizedItems });
        setEditingName(data.name || '');
        setEditingDate(data.date || '');
        setEditingDescription(data.description || '');
        setIsPublic(data.is_public || false);
        setItems(normalizedItems);
      }
    } catch (error) {
      console.error('Error fetching itinerary:', error);
      toast({ title: 'Error loading itinerary', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!itinerary) return;
    setSaving(true);
    try {
      // Normalize items for Supabase type and ensure order is correct
      const normalizedItems = items.map((item, idx) => ({
        ...item,
        eventId: item.eventId ?? '',
        order: idx, // Explicitly set order based on array index
        type: (item.eventId === '' || item.id.startsWith('custom-')) ? "CUSTOM" as "CUSTOM" : "EVENT" as "EVENT",
        title: item.notes || (item.event && item.event.title) || '',
        startTime: item.startTime ?? '',
        endTime: item.endTime ?? '',
        location_name: item.location || null,
        location_coordinates: item.coordinates || null,
        notes: item.notes || null,
      }));

      const updated = await updateItinerary(itinerary.id, {
        name: editingName,
        description: editingDescription,
        date: editingDate,
        is_public: isPublic,
        items: normalizedItems,
        preserveItems: false // Replace all items in the DB
      });

      if (updated) {
        // Normalize items from updated response for local state
        const localItems = (updated.items || []).map(item => ({
          ...item,
          eventId: item.eventId ?? '',
          location: item.location_name, // Map DB field to local field
          coordinates: item.location_coordinates, // Map DB field to local field
        }));

        setItinerary({ ...updated, items: localItems });
        toast({ title: 'Itinerary saved!' });
        navigate('/plan');
      }
    } catch (error) {
      errorReporter('Failed to save itinerary', error);
      toast({
        title: 'Error',
        description: 'Failed to save itinerary. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!itinerary) return;
    if (!window.confirm('Delete this itinerary?')) return;
    setSaving(true);
    try {
      const success = await deleteItinerary(itinerary.id);
      if (success) {
        toast({ title: 'Itinerary deleted' });
        navigate('/plan');
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      errorReporter('Failed to delete itinerary', error);
      toast({
        title: 'Error',
        description: 'Failed to delete itinerary. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = () => {
    if (!newItemTitle.trim()) return;
    setItems([
      ...items,
      {
        id: `custom-${Date.now()}`,
        eventId: '',
        notes: newItemTitle,
        order: items.length,
        type: 'CUSTOM',
      } as ItineraryItem,
    ]);
    setNewItemTitle('');
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId));
  };

  // Remove handleMoveItem, replaced by handleDragEnd

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((currentItems) => {
        const oldIndex = currentItems.findIndex((item) => item.id === active.id);
        const newIndex = currentItems.findIndex((item) => item.id === over.id);
        const newOrderedItems = arrayMove(currentItems, oldIndex, newIndex);
        return newOrderedItems.map((item, index) => ({ ...item, order: index }));
      });
    }
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!itinerary) {
    return (
      <div className="container mx-auto p-4 md:p-8 text-center">
        Itinerary not found or could not be loaded.
        <Button variant="link" onClick={() => navigate('/plan')}>Back to List</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Edit Itinerary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Use grid for better layout on larger screens */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="itinerary-name">Name</Label>
              <Input id="itinerary-name" value={editingName} onChange={e => setEditingName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="itinerary-date">Date</Label>
              <Input id="itinerary-date" value={editingDate} onChange={e => setEditingDate(e.target.value)} type="date" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="itinerary-description">Description</Label>
            <Textarea id="itinerary-description" value={editingDescription} onChange={e => setEditingDescription(e.target.value)} />
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold">Sharing Options</h3>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-medium">Public Itinerary</div>
                <div className="text-sm text-muted-foreground">
                  Make this itinerary public and shareable via a link.
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is-public"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="is-public" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {isPublic ? 'Public' : 'Private'}
                </label>
              </div>
            </div>

            {isPublic && (
              <div className="flex flex-col space-y-2">
                <Label htmlFor="share-link">Shareable Link:</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="share-link"
                    value={`${window.location.origin}/shared-plan/${itinerary.id}`}
                    readOnly
                    className="flex-grow text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/shared-plan/${itinerary.id}`);
                      toast({ title: 'Link copied!', description: 'The shareable link has been copied to your clipboard.' });
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-medium">Export to Calendar</div>
                <div className="text-sm text-muted-foreground">
                  Download this itinerary as an .ics file to import into your calendar app.
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.location.href = `/functions/v1/export-itinerary-ics?id=${itinerary.id}`;
                }}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold">Items</h3>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={items.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-2">
                  {items.map((item) => (
                    <SortableItem key={item.id} item={item} onRemove={handleRemoveItem} onUpdate={setItems} items={items} />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
            {/* Make Add Item section responsive */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="New item title (for custom items)"
                value={newItemTitle}
                onChange={e => setNewItemTitle(e.target.value)}
                className="flex-grow"
              />
              <div className="flex gap-2 flex-shrink-0">
                <Button onClick={handleAddItem}>Add Custom Item</Button>
                <Button
                  variant="outline"
                  onClick={() => toast({ title: 'AI Generation not implemented yet.' })}
                >
                  Generate with AI
                </Button>
              </div>
            </div>
          </div>

          {/* Make action buttons responsive */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-4 border-t">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Itinerary
            </Button>
            {/* Save Order button removed - order is saved with the main Save button */}
            {/* Add margin-right for spacing on larger screens */}
            {/* Disable delete while saving is happening */}
            <Button variant="destructive" onClick={handleDelete} disabled={saving} className="sm:mr-auto">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Itinerary
            </Button>
            <Button variant="ghost" onClick={() => navigate('/plan')} className="sm:ml-auto">
              Back to List
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Sortable Item Component
interface SortableItemProps {
  item: ItineraryItem;
  onRemove: (id: string) => void;
  onUpdate: React.Dispatch<React.SetStateAction<ItineraryItem[]>>;
  items: ItineraryItem[];
}

const SortableItem: React.FC<SortableItemProps> = ({ item, onRemove, onUpdate, items }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  // Local state for textarea value
  const [localValue, setLocalValue] = React.useState(item.event?.title || item.notes || '');
  React.useEffect(() => {
    setLocalValue(item.event?.title || item.notes || '');
  }, [item.event?.title, item.notes]);

  // Debounce update to parent
  const debounceTimeout = React.useRef<NodeJS.Timeout | null>(null);
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalValue(e.target.value);
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      if (item.eventId === '' || item.id.startsWith('custom-')) {
        const updatedItems = items.map(i =>
          i.id === item.id ? { ...i, notes: e.target.value } : i
        );
        onUpdate(updatedItems);
      }
    }, 400);
  };
  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    if (item.eventId === '' || item.id.startsWith('custom-')) {
      const updatedItems = items.map(i =>
        i.id === item.id ? { ...i, notes: e.target.value } : i
      );
      onUpdate(updatedItems);
    }
  };

  return (
    <li ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 border rounded mb-2 bg-card">
      <button {...attributes} {...listeners} className="cursor-grab p-1 text-muted-foreground">
        <GripVertical size={16} />
      </button>
      {/* Use Textarea for potentially longer notes/titles */}
      <Textarea
        className="flex-grow p-1 border rounded text-sm resize-none h-10 min-h-10"
        value={localValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        readOnly={item.eventId !== '' && !item.id.startsWith('custom-')}
        rows={1}
      />
      <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.event?.title || item.notes || 'item'}`}>
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">Remove Item</span>
      </Button>
    </li>
  );
};


export default EditItinerary;