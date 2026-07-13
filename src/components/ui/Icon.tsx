import { type CSSProperties } from 'react';
import {
  type LucideIcon,
  AlertTriangle,
  ArrowLeft,
  Bell,
  Bookmark,
  Building2,
  Calendar,
  CalendarHeart,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
  Flame,
  HandHelping,
  Heart,
  HelpCircle,
  Home,
  Image as ImageIcon,
  Info,
  Landmark,
  Loader,
  Lock,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Mic,
  Minus,
  MoreHorizontal,
  Moon,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Shield,
  Sparkles,
  Star,
  Sun,
  Tag,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  Wrench,
  X,
} from 'lucide-react';

/**
 * Icon — the canonical glyph dispatcher (COMPONENT_INVENTORY 8.1). Every icon has a
 * semantic name; the mapping to the underlying Lucide glyph is internal, so a family
 * swap never touches call sites. Local's map leans domestic and warm (spec 05):
 * requests = helping hands, organisations = landmark, events = calendar-heart.
 *
 * Icons are decorative by default (aria-hidden, Elevra fix #13). Pass `title` to expose
 * an accessible label (role="img").
 */
const MAP = {
  // domain (Local's ten entities)
  requests: HandHelping,
  listings: Tag,
  equipment: Wrench,
  services: Sparkles,
  alerts: Bell,
  places: MapPin,
  organisations: Landmark,
  businesses: Building2,
  events: CalendarHeart,
  messages: MessageCircle,
  people: Users,
  // general
  user: User,
  users: Users,
  bell: Bell,
  check: Check,
  close: X,
  search: Search,
  settings: Settings,
  filter: Filter,
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  back: ArrowLeft,
  plus: Plus,
  minus: Minus,
  sun: Sun,
  moon: Moon,
  shield: Shield,
  info: Info,
  help: HelpCircle,
  alert: AlertTriangle,
  refresh: RefreshCw,
  loader: Loader,
  edit: Pencil,
  remove: Trash2,
  send: Send,
  sparkle: Sparkles,
  star: Star,
  heart: Heart,
  bookmark: Bookmark,
  flame: Flame,
  'trend-up': TrendingUp,
  'trend-down': TrendingDown,
  camera: Camera,
  mic: Mic,
  image: ImageIcon,
  'external-link': ExternalLink,
  more: MoreHorizontal,
  menu: Menu,
  eye: Eye,
  'eye-off': EyeOff,
  lock: Lock,
  mail: Mail,
  phone: Phone,
  clock: Clock,
  calendar: Calendar,
  home: Home,
  pin: MapPin,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof MAP;

interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
  /** Provide to make the icon meaningful to assistive tech; omit to keep it decorative. */
  title?: string;
}

export function Icon({ name, size = 20, strokeWidth = 2, className, style, title }: IconProps) {
  const Glyph = MAP[name];
  const a11y = title
    ? ({ role: 'img', 'aria-label': title } as const)
    : ({ 'aria-hidden': true, focusable: false } as const);
  return (
    <Glyph
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      {...(style ? { style } : {})}
      {...a11y}
    />
  );
}
