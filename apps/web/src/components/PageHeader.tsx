import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  backHref?: string;
  backLabel?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, backHref, backLabel, children }: PageHeaderProps) {
  return (
    <header className="bg-background/80 backdrop-blur-md border-b border-border px-6 py-3 flex items-center gap-4 flex-wrap sticky top-0 z-50">
      {backHref ? (
        <Button variant="ghost" size="sm" asChild>
          <Link href={backHref}>
            <ArrowLeft className="size-4" />
            {backLabel ?? '返回'}
          </Link>
        </Button>
      ) : (
        <Link href="/dashboard" className="flex items-center gap-2 mr-2">
          <div className="size-8 gradient-brand rounded-lg flex items-center justify-center">
            <BookOpen className="size-4 text-white" />
          </div>
        </Link>
      )}
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      {children && <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">{children}</div>}
    </header>
  );
}
