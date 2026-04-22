export const KITCHEN_SCENE = {
  width: 1750,
  height: 899,
  backgroundSrc: "/kitchen_sprite.png",
  chefSheetSrc: "/chef_sprite_sheet_2.png",
  chef: {
    columns: 12,
    rows: 4,
    frameWidth: 128,
    frameHeight: 256,
    renderWidth: 198,
    renderHeight: 396,
    footY: 852,
  },
} as const;

export type KitchenStation = "fridge" | "oven" | "center" | "shelves";

export const KITCHEN_STATIONS: Record<KitchenStation, { x: number; y: number }> = {
  fridge: { x: 350, y: KITCHEN_SCENE.chef.footY },
  oven: { x: 770, y: KITCHEN_SCENE.chef.footY },
  center: { x: 1130, y: KITCHEN_SCENE.chef.footY },
  shelves: { x: 1405, y: KITCHEN_SCENE.chef.footY },
};

export const CHEF_FRAMES = {
  idle: [0],
  walk: [4, 5, 6, 7, 8, 9, 10, 11],
  recipe: [40],
  seasoning: [41],
  ingredients: [14],
  plating: [29],
  cooking: [24, 25, 26, 27],
  done: [38],
  error: [44],
} as const;

export type ChefPose = keyof typeof CHEF_FRAMES;

export function getSheetFrame(frame: number) {
  const col = frame % KITCHEN_SCENE.chef.columns;
  const row = Math.floor(frame / KITCHEN_SCENE.chef.columns);

  return {
    x: col * KITCHEN_SCENE.chef.frameWidth,
    y: row * KITCHEN_SCENE.chef.frameHeight,
    width: KITCHEN_SCENE.chef.frameWidth,
    height: KITCHEN_SCENE.chef.frameHeight,
  };
}
