import { Loader2 } from 'lucide-react';

export function Loading({ text = '加载中...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-muted-foreground">
      <Loader2 className="size-5 animate-spin mr-2" />
      <span className="text-sm">{text}</span>
    </div>
  );
}
