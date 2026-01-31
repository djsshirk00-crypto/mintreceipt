import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const themes = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

interface ThemeToggleProps {
  value: string;
  onChange: (theme: 'light' | 'dark' | 'system') => void;
}

export function ThemeToggle({ value, onChange }: ThemeToggleProps) {
  const { setTheme } = useTheme();

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    setTheme(theme);
    onChange(theme);
  };

  return (
    <div className="flex gap-2">
      {themes.map(({ value: themeValue, label, icon: Icon }) => (
        <Button
          key={themeValue}
          variant={value === themeValue ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleThemeChange(themeValue)}
          className={cn(
            'flex-1 gap-2',
            value === themeValue && 'pointer-events-none'
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Button>
      ))}
    </div>
  );
}
