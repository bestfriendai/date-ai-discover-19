
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckIcon, InfoIcon } from '@/lib/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Feature {
  name: string;
  description: string;
  available: boolean;
  comingSoon?: boolean;
  tooltip?: string;
}

interface FeaturesListProps {
  features: Feature[];
  onClose?: () => void;
}

export const FeaturesList: React.FC<FeaturesListProps> = ({ features, onClose }) => {
  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-border/50 bg-card/80 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Features</CardTitle>
        <CardDescription>
          Discover what DateAI can do for you
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className={`flex items-start p-3 rounded-lg ${
                feature.available 
                  ? 'bg-primary/10 border border-primary/20' 
                  : feature.comingSoon 
                    ? 'bg-amber-500/10 border border-amber-500/20' 
                    : 'bg-muted/50 border border-muted/20'
              }`}
            >
              <div className={`flex-shrink-0 rounded-full p-1 ${
                feature.available 
                  ? 'bg-primary/20 text-primary' 
                  : feature.comingSoon 
                    ? 'bg-amber-500/20 text-amber-500' 
                    : 'bg-muted text-muted-foreground'
              }`}>
                <CheckIcon className="h-4 w-4" />
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center">
                  <h3 className={`text-sm font-medium ${
                    feature.available 
                      ? 'text-foreground' 
                      : feature.comingSoon 
                        ? 'text-amber-500' 
                        : 'text-muted-foreground'
                  }`}>
                    {feature.name}
                  </h3>
                  
                  {feature.tooltip && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 ml-1 p-0">
                            <InfoIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs text-xs">{feature.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  
                  {feature.comingSoon && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-500">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className={`mt-1 text-xs ${
                  feature.available 
                    ? 'text-foreground/80' 
                    : feature.comingSoon 
                      ? 'text-foreground/70' 
                      : 'text-muted-foreground'
                }`}>
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {onClose && (
          <div className="mt-6 flex justify-end">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FeaturesList;
