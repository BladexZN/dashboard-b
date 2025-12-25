import { AdvisorStat, ProductStat, StatCardData, VolumeStat } from './types';

export const STATS_DATA: StatCardData[] = [
  {
    title: "Total Solicitudes",
    value: 0,
    icon: "folder_open",
    colorClass: "text-blue-500",
    bgClass: "bg-blue-500/10 group-hover:bg-blue-500"
  },
  {
    title: "Pendientes",
    value: 0,
    icon: "hourglass_empty",
    colorClass: "text-yellow-500",
    bgClass: "bg-yellow-500/10 group-hover:bg-yellow-500"
  },
  {
    title: "En Producción",
    value: 0,
    icon: "precision_manufacturing",
    colorClass: "text-purple-500",
    bgClass: "bg-purple-500/10 group-hover:bg-purple-500"
  },
  {
    title: "Listo / Entregado",
    value: 0,
    icon: "check_circle",
    colorClass: "text-primary",
    bgClass: "bg-primary/10 group-hover:bg-primary"
  }
];

export const ADVISOR_STATS: AdvisorStat[] = [];

export const PRODUCT_STATS: ProductStat[] = [];

export const VOLUME_STATS: VolumeStat[] = [];
