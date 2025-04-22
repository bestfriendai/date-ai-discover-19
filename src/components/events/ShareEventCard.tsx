import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Event } from '@/types';
import { Share2, Copy, Download, Twitter, Facebook, Instagram, Linkedin } from 'lucide-react';
import html2canvas from 'html2canvas';

interface ShareEventCardProps {
  event: Event;
  onClose?: () => void;
}

const ShareEventCard: React.FC<ShareEventCardProps> = ({ event, onClose }) => {
  const [activeTab, setActiveTab] = useState('social');
  const [customMessage, setCustomMessage] = useState(
    `Check out this event: ${event.title} on ${event.date} at ${event.venue || event.location}! #DateAI #Events`
  );
  const shareCardRef = useRef<HTMLDivElement>(null);

  // Generate share URL
  const shareUrl = `${window.location.origin}/map?selectedEventId=${event.id}`;

  // Handle copy to clipboard
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({ title: 'Link copied to clipboard!' });
  };

  // Handle copy text to clipboard
  const handleCopyText = () => {
    navigator.clipboard.writeText(customMessage);
    toast({ title: 'Text copied to clipboard!' });
  };

  // Handle download image
  const handleDownloadImage = async () => {
    if (!shareCardRef.current) return;

    try {
      const canvas = await html2canvas(shareCardRef.current, {
        scale: 2,
        backgroundColor: null,
        logging: false
      });

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_event.png`;
      link.click();

      toast({ title: 'Image downloaded!' });
    } catch (error) {
      console.error('Error generating image:', error);
      toast({
        title: 'Error generating image',
        description: 'Could not create shareable image.',
        variant: 'destructive'
      });
    }
  };

  // Handle share to social media
  const handleShareToSocial = (platform: 'twitter' | 'facebook' | 'linkedin') => {
    let url = '';

    switch (platform) {
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(customMessage)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(customMessage)}`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
    }

    window.open(url, '_blank');
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold">Share Event</CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="social">Social Media</TabsTrigger>
            <TabsTrigger value="image">Create Image</TabsTrigger>
          </TabsList>

          <TabsContent value="social" className="space-y-4 pt-4">
            <Textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Write your message..."
              className="min-h-[100px]"
            />

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleCopyText}
              >
                <Copy className="h-4 w-4" />
                Copy Text
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleCopyLink}
              >
                <Copy className="h-4 w-4" />
                Copy Link
              </Button>
            </div>

            <div className="pt-4">
              <h4 className="text-sm font-medium mb-2">Share to:</h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 text-[#1DA1F2]"
                  onClick={() => handleShareToSocial('twitter')}
                >
                  <Twitter className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full bg-[#4267B2]/10 hover:bg-[#4267B2]/20 text-[#4267B2]"
                  onClick={() => handleShareToSocial('facebook')}
                >
                  <Facebook className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full bg-[#0077B5]/10 hover:bg-[#0077B5]/20 text-[#0077B5]"
                  onClick={() => handleShareToSocial('linkedin')}
                >
                  <Linkedin className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full bg-gradient-to-br from-[#833AB4]/10 via-[#FD1D1D]/10 to-[#FCAF45]/10 hover:from-[#833AB4]/20 hover:via-[#FD1D1D]/20 hover:to-[#FCAF45]/20 text-[#FD1D1D]"
                  onClick={() => window.open(`https://www.instagram.com/`, '_blank')}
                >
                  <Instagram className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="image" className="space-y-4 pt-4">
            <div
              ref={shareCardRef}
              className="p-6 rounded-lg border bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-sm"
            >
              <div className="flex flex-col space-y-4">
                {event.image && (
                  <div className="w-full h-40 rounded-lg overflow-hidden">
                    <img
                      src={event.image}
                      alt={event.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).onerror = null;
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="text-xl font-bold">{event.title}</h3>

                  <div className="flex items-center text-sm text-muted-foreground">
                    <span className="font-medium">{event.date}</span>
                    {event.time && <span className="mx-1">•</span>}
                    {event.time && <span>{event.time}</span>}
                  </div>

                  {(event.venue || event.location) && (
                    <div className="text-sm">
                      {event.venue || event.location}
                    </div>
                  )}

                  {event.price && (
                    <div className="text-sm font-medium">
                      {event.price}
                    </div>
                  )}
                </div>

                <div className="pt-2 text-xs text-muted-foreground">
                  Shared via DateAI • dateai.app
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                className="gap-2 w-full"
                onClick={handleDownloadImage}
              >
                <Download className="h-4 w-4" />
                Download Image
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ShareEventCard;
