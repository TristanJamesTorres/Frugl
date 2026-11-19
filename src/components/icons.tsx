import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faBell as faBellRegular,
  faBookmark as faBookmarkRegular,
  faCircleCheck as faCircleCheckRegular,
  faEye as faEyeRegular,
  faEyeSlash as faEyeSlashRegular,
  faFlag as faFlagRegular,
  faMessage as faMessageRegular,
  faPaperPlane as faPaperPlaneRegular,
  faPenToSquare as faPenToSquareRegular,
  faStar as faStarRegular,
  faUser as faUserRegular,
} from '@fortawesome/free-regular-svg-icons';
import {
  faBell,
  faBookmark,
  faCamera,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faCircleCheck,
  faCircleExclamation,
  faCircleNotch,
  faCloudArrowUp,
  faDownload,
  faDoorOpen,
  faExternalLinkAlt,
  faEye,
  faEyeSlash,
  faFileLines,
  faFlag,
  faGear,
  faGaugeHigh,
  faHouse,
  faLaptop,
  faLocationDot,
  faMagnifyingGlass,
  faMessage,
  faPaperPlane,
  faPaperclip,
  faPenToSquare,
  faPlusCircle,
  faRightFromBracket,
  faShield,
  faShieldHalved,
  faDatabase,
  faSpinner,
  faStar,
  faTag,
  faTriangleExclamation,
  faTrashCan,
  faUser,
  faUsers,
  faWandMagicSparkles,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

type IconVariant = 'regular' | 'solid';

type Props = {
  size?: number;
  className?: string;
  variant?: IconVariant;
};

function icon(
  solid: IconDefinition,
  regular: IconDefinition = solid,
  defaultVariant: IconVariant = 'solid'
) {
  return function AppIcon({ size = 20, className, variant = defaultVariant }: Props) {
    return (
      <FontAwesomeIcon
        icon={variant === 'regular' ? regular : solid}
        className={className}
        style={{ width: size, height: size }}
        aria-hidden='true'
      />
    );
  };
}

export const AlertCircle = icon(faCircleExclamation);
export const AlertTriangle = icon(faTriangleExclamation);
export const BadgeCheck = icon(faCircleCheck, faCircleCheckRegular);
export const Bell = icon(faBell, faBellRegular, 'regular');
export const Bookmark = icon(faBookmark, faBookmarkRegular, 'regular');
export const Camera = icon(faCamera);
export const CheckCircle = icon(faCircleCheck, faCircleCheckRegular, 'regular');
export const CheckCircle2 = CheckCircle;
export const ChevronDown = icon(faChevronDown);
export const ChevronLeft = icon(faChevronLeft);
export const ChevronRight = icon(faChevronRight);
export const DoorOpen = icon(faDoorOpen);
export const Database = icon(faDatabase);
export const Download = icon(faDownload);
export const Edit3 = icon(faPenToSquare, faPenToSquareRegular, 'regular');
export const Eye = icon(faEye, faEyeRegular, 'regular');
export const EyeOff = icon(faEyeSlash, faEyeSlashRegular, 'regular');
export const FileLines = icon(faFileLines);
export const ExternalLink = icon(faExternalLinkAlt);
export const Flag = icon(faFlag, faFlagRegular, 'regular');
export const Gauge = icon(faGaugeHigh);
export const Gear = icon(faGear);
export const Home = icon(faHouse);
export const Laptop = icon(faLaptop);
export const Loader2 = icon(faSpinner);
export const MapPin = icon(faLocationDot);
export const MessageCircle = icon(faMessage, faMessageRegular, 'regular');
export const PlusCircle = icon(faPlusCircle);
export const RefreshCw = icon(faCircleNotch);
export const Search = icon(faMagnifyingGlass);
export const SignOut = icon(faRightFromBracket);
export const Send = icon(faPaperPlane, faPaperPlaneRegular, 'regular');
export const Paperclip = icon(faPaperclip);
export const Shield = icon(faShield);
export const ShieldCheck = icon(faShieldHalved);
export const Sparkles = icon(faWandMagicSparkles);
export const Star = icon(faStar, faStarRegular, 'regular');
export const Tag = icon(faTag);
export const Trash = icon(faTrashCan);
export const UploadCloud = icon(faCloudArrowUp);
export const User = icon(faUser, faUserRegular, 'regular');
export const Users = icon(faUsers);
export const X = icon(faXmark);
