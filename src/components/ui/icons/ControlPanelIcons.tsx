'use client';

import React from 'react';

interface IconProps {
  width?: number;
  height?: number;
  color?: string;
}

export function ProjectsIcon({
  width = 16,
  height = 16,
  color = 'white',
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox='0 0 24 24'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M22 19C22 19.6 21.6 20 21 20H3C2.4 20 2 19.6 2 19V5C2 4.4 2.4 4 3 4H7L9 6H21C21.6 6 22 6.4 22 7V19Z'
        stroke={color}
        strokeWidth='2'
        fill='none'
      />
    </svg>
  );
}

export function FloorsIcon({
  width = 16,
  height = 16,
  color = 'white',
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox='0 0 24 24'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M4 20H10V14H16V8H20'
        stroke={color}
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}

export function PerformanceIcon({
  width = 16,
  height = 16,
  color = 'white',
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox='0 0 24 24'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M3 12H6L9 3L15 21L18 12H21'
        stroke={color}
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}

export function POIIcon({
  width = 16,
  height = 16,
  color = 'white',
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox='0 0 24 24'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M21 10C21 17 12 23 12 23S3 17 3 10C3 5.03 7.03 1 12 1S21 5.03 21 10Z'
        stroke={color}
        strokeWidth='2'
        fill='none'
      />
      <circle
        cx='12'
        cy='10'
        r='3'
        stroke={color}
        strokeWidth='2'
        fill='none'
      />
    </svg>
  );
}
