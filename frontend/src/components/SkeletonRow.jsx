import React from 'react';

export default function SkeletonRow({ cols = 7 }) {
  const widths = ['40px', '140px', '100px', '90px', '80px', '50px', '90px', '110px'];
  return (
    <tr className="skeleton-row">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i}>
          <div
            className="skeleton skeleton-cell"
            style={{ width: widths[i] || '80px' }}
          />
        </td>
      ))}
    </tr>
  );
}
