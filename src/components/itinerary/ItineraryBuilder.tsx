import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Clock, MapPin, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Itinerary, ItineraryItem } from '@/types';
import { formatTime } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ItineraryBuilderProps {
  itinerary: Itinerary;
  onSave: (itinerary: Itinerary) => Promise<void>;
}

const ItineraryBuilder = ({ itinerary, onSave }: ItineraryBuilderProps) => {
  const [currentItinerary, setCurrentItinerary] = useState<Itinerary>(itinerary);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Handle drag and drop reordering (simplified version without react-beautiful-dnd)
  const moveItem = (fromIndex: number, toIndex: number) => {
    const items = Array.from(currentItinerary.items);
    const [movedItem] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, movedItem);
    
    // Update order property for each item
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index
    }));
    
    setCurrentItinerary({
      ...currentItinerary,
      items: updatedItems
    });
  };

  // Add a new custom item
  const addCustomItem = () => {
    const now = new Date();
    const startTime = new Date(currentItinerary.date);
    startTime.setHours(now.getHours(), 0, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);
    
    const newItem: ItineraryItem = {
      id: `custom-${Date.now()}`,
      title: 'New Item',
      type: 'CUSTOM',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      order: currentItinerary.items.length
    };
    
    setCurrentItinerary({
      ...currentItinerary,
      items: [...currentItinerary.items, newItem]
    });
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
        <Clock className="h-4 w-4" />
        <span>{new Date(currentItinerary.date).toLocaleDateString()}</span>
      </div>
      
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h3 className="font-medium">Itinerary Items</h3>
          <Button 
            size="sm" 
            onClick={addCustomItem}
            className="flex items-center gap-1"
          >
            <PlusCircle className="h-4 w-4" />
            Add Item
          </Button>
        </div>
        
        <div className="p-4 min-h-[200px]">
          {currentItinerary.items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No items in this itinerary yet. Add an item or drag events here.
            </div>
          ) : (
            <div className="space-y-3">
              {currentItinerary.items
                .sort((a, b) => a.order - b.order)
                .map((item, index) => (
                  <motion.div
                    key={item.id}
                    className="bg-muted/50 rounded-lg p-3 border border-border/50"
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    drag="y"
                    dragConstraints={{ top: 0, bottom: 0 }}
                    onDragEnd={(_, info) => {
                      const offset = info.offset.y;
                      const velocity = info.velocity.y;
                      const height = 70; // Approximate height of an item
                      
                      if (Math.abs(velocity) >= 500 || Math.abs(offset) >= height / 2) {
                        const direction = velocity < 0 || offset < 0 ? -1 : 1;
                        const newIndex = Math.max(0, Math.min(currentItinerary.items.length - 1, index + direction));
                        moveItem(index, newIndex);
                      }
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium">{item.title}</div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(item.startTime)} - {formatTime(item.endTime)}
                          </div>
                          {item.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {item.location}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ItineraryBuilder;
