import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { 
  PlusCircleIcon, 
  ClockIcon, 
  MapPinIcon, 
  Trash2Icon, 
  EditIcon, 
  AlertCircleIcon, 
  CalendarIcon 
} from '@/lib/icons';
import { motion, AnimatePresence } from 'framer-motion';
import type { Itinerary, ItineraryItem } from '@/types';
import { formatTime, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { reorderItineraryItems } from '@/services/itineraryService';
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

interface ItineraryBuilderProps {
  itinerary: Itinerary;
  onSave: (itinerary: Itinerary) => Promise<void>;
}

const ItineraryBuilder = ({ itinerary, onSave }: ItineraryBuilderProps) => {
  const [currentItinerary, setCurrentItinerary] = useState<Itinerary>(itinerary);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // State for custom item dialog
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [showEditItemDialog, setShowEditItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemLocation, setNewItemLocation] = useState('');
  const [newItemNotes, setNewItemNotes] = useState('');
  const [newItemStartTime, setNewItemStartTime] = useState('');
  const [newItemEndTime, setNewItemEndTime] = useState('');

  // Setup DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end event
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const activeIndex = currentItinerary.items.findIndex(item => item.id === active.id);
      const overIndex = currentItinerary.items.findIndex(item => item.id === over.id);

      const newItems = arrayMove(currentItinerary.items, activeIndex, overIndex);

      // Update order property for each item
      const updatedItems = newItems.map((item, index) => ({
        ...item,
        order: index
      }));

      setCurrentItinerary({
        ...currentItinerary,
        items: updatedItems
      });

      // If this is a saved itinerary (not a new one), update the order in the database
      if (currentItinerary.id && !currentItinerary.id.startsWith('new-')) {
        try {
          // Get the IDs in the new order
          const itemIds = updatedItems.map(item => item.id);
          await reorderItineraryItems(currentItinerary.id, itemIds);
        } catch (error) {
          console.error('Error updating item order:', error);
          toast({
            title: "Error",
            description: "Failed to update item order. Your changes may not be saved.",
            variant: "destructive"
          });
        }
      }
    }
  }, [currentItinerary, toast]);

  // Check for time conflicts
  const checkTimeConflicts = () => {
    const conflicts: { item1: ItineraryItem, item2: ItineraryItem }[] = [];
    const sortedItems = [...currentItinerary.items].sort((a, b) => a.order - b.order);

    for (let i = 0; i < sortedItems.length; i++) {
      const item1 = sortedItems[i];
      const start1 = new Date(item1.startTime).getTime();
      const end1 = new Date(item1.endTime).getTime();

      for (let j = i + 1; j < sortedItems.length; j++) {
        const item2 = sortedItems[j];
        const start2 = new Date(item2.startTime).getTime();
        const end2 = new Date(item2.endTime).getTime();

        // Check for overlap
        if ((start1 <= end2 && end1 >= start2)) {
          conflicts.push({ item1, item2 });
        }
      }
    }

    return conflicts;
  };

  // Open add custom item dialog
  const openAddItemDialog = () => {
    const now = new Date();
    const startTime = new Date(currentItinerary.date);
    startTime.setHours(now.getHours(), 0, 0, 0);

    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);

    // Format times for input fields
    setNewItemTitle('');
    setNewItemLocation('');
    setNewItemNotes('');
    setNewItemStartTime(formatTimeForInput(startTime));
    setNewItemEndTime(formatTimeForInput(endTime));

    setShowAddItemDialog(true);
  };

  // Open edit item dialog
  const openEditItemDialog = (item: ItineraryItem) => {
    setEditingItem(item);
    setNewItemTitle(item.title);
    setNewItemLocation(item.location || '');
    setNewItemNotes(item.notes || '');

    const startTime = new Date(item.startTime);
    const endTime = new Date(item.endTime);

    setNewItemStartTime(formatTimeForInput(startTime));
    setNewItemEndTime(formatTimeForInput(endTime));

    setShowEditItemDialog(true);
  };

  // Format time for input fields
  const formatTimeForInput = (date: Date) => {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  // Add a new custom item
  const addCustomItem = () => {
    if (!newItemTitle) {
      toast({
        title: "Title required",
        description: "Please provide a title for the item.",
        variant: "destructive"
      });
      return;
    }

    // Parse times
    const [startHours, startMinutes] = newItemStartTime.split(':').map(Number);
    const [endHours, endMinutes] = newItemEndTime.split(':').map(Number);

    const startTime = new Date(currentItinerary.date);
    startTime.setHours(startHours, startMinutes, 0, 0);

    const endTime = new Date(currentItinerary.date);
    endTime.setHours(endHours, endMinutes, 0, 0);

    // Validate end time is after start time
    if (endTime <= startTime) {
      toast({
        title: "Invalid time range",
        description: "End time must be after start time.",
        variant: "destructive"
      });
      return;
    }

    const newItem: ItineraryItem = {
      id: `custom-${Date.now()}`,
      title: newItemTitle,
      description: '',
      location: newItemLocation,
      notes: newItemNotes,
      type: 'CUSTOM',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      order: currentItinerary.items.length
    };

    setCurrentItinerary({
      ...currentItinerary,
      items: [...currentItinerary.items, newItem]
    });

    setShowAddItemDialog(false);
  };

  // Save edited item
  const saveEditedItem = () => {
    if (!editingItem || !newItemTitle) {
      toast({
        title: "Title required",
        description: "Please provide a title for the item.",
        variant: "destructive"
      });
      return;
    }

    // Parse times
    const [startHours, startMinutes] = newItemStartTime.split(':').map(Number);
    const [endHours, endMinutes] = newItemEndTime.split(':').map(Number);

    const startTime = new Date(currentItinerary.date);
    startTime.setHours(startHours, startMinutes, 0, 0);

    const endTime = new Date(currentItinerary.date);
    endTime.setHours(endHours, endMinutes, 0, 0);

    // Validate end time is after start time
    if (endTime <= startTime) {
      toast({
        title: "Invalid time range",
        description: "End time must be after start time.",
        variant: "destructive"
      });
      return;
    }

    const updatedItem: ItineraryItem = {
      ...editingItem,
      title: newItemTitle,
      location: newItemLocation,
      notes: newItemNotes,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    };

    updateItem(editingItem.id, updatedItem);
    setShowEditItemDialog(false);
  };

  // Remove an item
  const removeItem = (itemId: string) => {
    const updatedItems = currentItinerary.items
      .filter(item => item.id !== itemId)
      .map((item, index) => ({
        ...item,
        order: index
      }));

    setCurrentItinerary({
      ...currentItinerary,
      items: updatedItems
    });
  };

  // Update an item
  const updateItem = (itemId: string, updates: Partial<ItineraryItem>) => {
    const updatedItems = currentItinerary.items.map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    );

    setCurrentItinerary({
      ...currentItinerary,
      items: updatedItems
    });
  };

  // Save the itinerary
  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(currentItinerary);
      toast({
        title: "Itinerary saved",
        description: "Your itinerary has been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving itinerary:', error);
      toast({
        title: "Error",
        description: "Failed to save itinerary. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{currentItinerary.name}</h2>
        <Button
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Itinerary'}
        </Button>
      </div>

      <div className="flex items-center gap-2 text-muted-foreground">
        <ClockIcon className="h-4 w-4" />
        <span>{new Date(currentItinerary.date).toLocaleDateString()}</span>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h3 className="font-medium">Itinerary Items</h3>
          <Button
            size="sm"
            onClick={openAddItemDialog}
            className="flex items-center gap-1"
          >
            <PlusCircleIcon className="h-4 w-4" />
            Add Item
          </Button>
        </div>

        <div className="p-4 min-h-[200px]">
          {currentItinerary.items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No items in this itinerary yet. Add an item or drag events here.
            </div>
          ) : (
            <>
              {/* Time conflict warnings */}
              {checkTimeConflicts().length > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertCircleIcon className="h-4 w-4" />
                    Time Conflicts Detected
                  </div>
                  <ul className="mt-2 pl-6 list-disc space-y-1">
                    {checkTimeConflicts().map((conflict, i) => (
                      <li key={i}>
                        "{conflict.item1.title}" and "{conflict.item2.title}" have overlapping times.
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Sortable items list */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={currentItinerary.items.map(item => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    <AnimatePresence>
                      {currentItinerary.items
                        .sort((a, b) => a.order - b.order)
                        .map((item) => (
                          <SortableItem
                            key={item.id}
                            item={item}
                            onRemove={removeItem}
                            onEdit={openEditItemDialog}
                          />
                        ))}
                    </AnimatePresence>
                  </div>
                </SortableContext>
              </DndContext>
            </>
          )}
        </div>
      </div>

      {/* Add Custom Item Dialog */}
      <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Item</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="item-title">Title</Label>
              <Input
                id="item-title"
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                placeholder="e.g., Dinner at Restaurant"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={newItemStartTime}
                  onChange={(e) => setNewItemStartTime(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={newItemEndTime}
                  onChange={(e) => setNewItemEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="item-location">Location (optional)</Label>
              <Input
                id="item-location"
                value={newItemLocation}
                onChange={(e) => setNewItemLocation(e.target.value)}
                placeholder="e.g., 123 Main St"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="item-notes">Notes (optional)</Label>
              <Textarea
                id="item-notes"
                value={newItemNotes}
                onChange={(e) => setNewItemNotes(e.target.value)}
                placeholder="Any additional details..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItemDialog(false)}>Cancel</Button>
            <Button onClick={addCustomItem}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={showEditItemDialog} onOpenChange={setShowEditItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-item-title">Title</Label>
              <Input
                id="edit-item-title"
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-start-time">Start Time</Label>
                <Input
                  id="edit-start-time"
                  type="time"
                  value={newItemStartTime}
                  onChange={(e) => setNewItemStartTime(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-end-time">End Time</Label>
                <Input
                  id="edit-end-time"
                  type="time"
                  value={newItemEndTime}
                  onChange={(e) => setNewItemEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-item-location">Location (optional)</Label>
              <Input
                id="edit-item-location"
                value={newItemLocation}
                onChange={(e) => setNewItemLocation(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-item-notes">Notes (optional)</Label>
              <Textarea
                id="edit-item-notes"
                value={newItemNotes}
                onChange={(e) => setNewItemNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditItemDialog(false)}>Cancel</Button>
            <Button onClick={saveEditedItem}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Sortable Item Component
interface SortableItemProps {
  item: ItineraryItem;
  onRemove: (id: string) => void;
  onEdit: (item: ItineraryItem) => void;
}

const SortableItem = ({ item, onRemove, onEdit }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-muted/50 rounded-lg p-3 border border-border/50 cursor-grab active:cursor-grabbing",
        isDragging && "shadow-md"
      )}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      {...attributes}
      {...listeners}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="font-medium">{item.title}</div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <ClockIcon className="h-3 w-3" />
              {formatTime(item.startTime)} - {formatTime(item.endTime)}
            </div>
            {item.location && (
              <div className="flex items-center gap-1">
                <MapPinIcon className="h-3 w-3" />
                {item.location}
              </div>
            )}
            {item.notes && (
              <div className="w-full mt-1 text-xs italic">
                {item.notes}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(item)}
            className="h-8 w-8 text-muted-foreground hover:text-primary"
          >
            <EditIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(item.id)}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <Trash2Icon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default ItineraryBuilder;
