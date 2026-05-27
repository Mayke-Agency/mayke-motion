"use client";

import { useState } from "react";

export function BrandColorField({ defaultValue = "#733038" }: { defaultValue?: string }) {
  const [color, setColor] = useState(defaultValue);

  return (
    <div className="color-input-row">
      <input
        aria-label="Brand color picker"
        className="color-swatch-input"
        type="color"
        value={color}
        onChange={(event) => setColor(event.target.value)}
      />
      <input
        className="input"
        id="brandColor"
        name="brandColor"
        value={color}
        onChange={(event) => setColor(event.target.value)}
        pattern="^#[0-9A-Fa-f]{6}$"
        required
      />
    </div>
  );
}
