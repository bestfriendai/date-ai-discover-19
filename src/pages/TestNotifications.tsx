import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Bell, Loader2 } from 'lucide-react';
import notificationService from '@/services/notificationService';
import { useAuth } from '@/contexts/AuthContext';

const TestNotifications: React.FC = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState('Test Notification');
  const [message, setMessage] = useState('This is a test notification message.');
  const [type, setType] = useState<'reminder' | 'system' | 'social'>('system');
  const [loading, setLoading] = useState(false);
  
  const handleCreateNotification = async () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to create test notifications',
        variant: 'destructive'
      });
      return;
    }
    
    if (!title || !message) {
      toast({
        title: 'Missing fields',
        description: 'Please provide a title and message',
        variant: 'destructive'
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const notification = await notificationService.createTestNotification(
        title,
        message,
        type
      );
      
      if (notification) {
        toast({
          title: 'Notification created',
          description: 'Check the notification center to see it',
        });
        
        // Reset form
        setTitle('Test Notification');
        setMessage('This is a test notification message.');
        setType('system');
      } else {
        toast({
          title: 'Error',
          description: 'Failed to create notification',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error creating test notification:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while creating the notification',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Test Notifications</CardTitle>
            <CardDescription>
              Please sign in to test notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled>Sign in required</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Test Notifications
          </CardTitle>
          <CardDescription>
            Create test notifications to verify the notification system
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Notification Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter notification title"
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Notification Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter notification message"
              rows={3}
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="type">Notification Type</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as 'reminder' | 'system' | 'social')}
              disabled={loading}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Select notification type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reminder">Reminder</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="social">Social</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button
            onClick={handleCreateNotification}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Bell className="mr-2 h-4 w-4" />
                Create Test Notification
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestNotifications;
