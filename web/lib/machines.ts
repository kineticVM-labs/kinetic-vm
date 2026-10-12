/** Sample machines for the landing page. Images live in `public/machines`. */
export type Machine = {
  slug: string;
  label: string;
  agent: number;
};

export const machines: readonly Machine[] = [
  { slug: "vending-cola", label: "Vending machine", agent: 142 },
  { slug: "arm-showroom", label: "Robot arm", agent: 87 },
  { slug: "drone-survey", label: "Survey drone", agent: 311 },
  { slug: "courier-street", label: "Delivery robot", agent: 56 },
  { slug: "humanoid-wave", label: "Humanoid", agent: 404 },
  { slug: "amr-warehouse", label: "Warehouse AMR", agent: 219 },
  { slug: "printer-farm", label: "3D print farm", agent: 73 },
  { slug: "quadruped", label: "Quadruped", agent: 158 },
  { slug: "vending-snack", label: "Snack vending", agent: 143 },
  { slug: "arm-industrial", label: "Industrial arm", agent: 92 },
  { slug: "drone-crop", label: "Crop drone", agent: 267 },
  { slug: "ev-charger", label: "EV charger", agent: 330 },
  { slug: "humanoid-stand", label: "Humanoid", agent: 418 },
  { slug: "parcel-locker", label: "Parcel locker", agent: 61 },
  { slug: "camera-wall", label: "Smart camera", agent: 184 },
  { slug: "robot-hand", label: "Robotic hand", agent: 95 },
  { slug: "vending-night", label: "Vending machine", agent: 149 },
  { slug: "drone-quad", label: "Quadcopter", agent: 302 },
  { slug: "arm-line", label: "Assembly line", agent: 101 },
  { slug: "courier-close", label: "Sidewalk courier", agent: 58 },
  { slug: "humanoid-service", label: "Service robot", agent: 427 },
  { slug: "coffee-machine", label: "Coffee machine", agent: 176 },
  { slug: "amr-fulfillment", label: "Fulfillment robots", agent: 224 },
  { slug: "printer-desk", label: "3D printer", agent: 77 },
  { slug: "drone-glide", label: "Drone", agent: 315 },
  { slug: "robot-vacuum", label: "Robot vacuum", agent: 199 },
  { slug: "vending-street", label: "Drink vending", agent: 151 },
  { slug: "arm-pick", label: "Pick-and-place arm", agent: 108 },
  { slug: "camera-pole", label: "Traffic camera", agent: 190 },
  { slug: "humanoid-android", label: "Android", agent: 433 },
  { slug: "drone-mapping", label: "Mapping drone", agent: 321 },
];

export function machineSrc(slug: string): string {
  return `/machines/${slug}.webp`;
}
