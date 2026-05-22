export type ArcadaWallSide = "top" | "right" | "bottom" | "left";

export type ArcadaPocCanvas = {
  width: number;
  height: number;
  unit: "normalized" | "meters";
  scaleLabel?: string;
};

export type ArcadaPocPoint = { x: number; y: number };

export type ArcadaPocRoom = {
  id: string;
  label: string;
  type: string;
  polygon: ArcadaPocPoint[];
  areaM2?: number;
  areaKind?: "covered" | "outdoor" | "semi_covered";
};

export type ArcadaPocWall = {
  id: string;
  roomIds: string[];
  from: ArcadaPocPoint;
  to: ArcadaPocPoint;
  thickness: number;
  kind: "exterior" | "interior";
  dashed?: boolean;
};

export type ArcadaPocOpening = {
  id: string;
  type: "door" | "window" | "open_passage" | "sliding" | "wide_sliding";
  wallId?: string;
  fromRoomId?: string;
  toRoomId?: string;
  roomId?: string;
  wall: ArcadaWallSide;
  position: number;
  width: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type ArcadaPocFurniture = {
  id: string;
  type: string;
  roomId: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ArcadaPocLabel = {
  roomId: string;
  name: string;
  areaText: string | null;
  x: number;
  y: number;
};

export type ArcadaPocScene = {
  canvas: ArcadaPocCanvas;
  rooms: ArcadaPocRoom[];
  walls: ArcadaPocWall[];
  openings: ArcadaPocOpening[];
  furniture: ArcadaPocFurniture[];
  labels: ArcadaPocLabel[];
};

export type ArcadaPocRenderResult = {
  svg: string;
  viewBox: string;
  warnings: string[];
};
