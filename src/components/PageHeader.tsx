import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import PrivacyToggle from './PrivacyToggle';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  back?: string;
  action?: ReactNode;
}

export default function PageHeader({ title, subtitle, back, action }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-20 -mx-4 mb-4 flex items-start justify-between gap-3 bg-background/85 px-4 pb-3 pt-4 backdrop-blur-xl md:-mx-6 md:px-6 md:pb-4 md:pt-6 lg:-mx-8 lg:px-8">
      <div className="flex min-w-0 items-start gap-2">
        {back ? (
          <Link
            to={back}
            aria-label="Back"
            className="-ml-2 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ChevronLeft size={20} />
          </Link>
        ) : null}
        <div className="min-w-0">
          <h1 className="truncate text-[20px] font-bold leading-tight md:text-[25px]">{title}</h1>
          {subtitle ? (
            <p className="mt-0.5 text-[12.5px] text-muted-foreground md:mt-1 md:text-[13px]">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 pt-0.5">
        <PrivacyToggle />
        {action}
      </div>
    </header>
  );
}
