import React, { useEffect, useMemo, useRef, useState } from 'react';
import { METRIC_DEFINITIONS, MetricKey, RankedGpu } from '../lib/math/types';
import { evaluateParetoFrontier } from '../lib/math/pareto';
import {
  ExtrapolationConfig,
  evaluateLinearExtrapolation,
} from '../lib/math/extrapolation';
import {
  CameraPresetId,
  CAMERA_PRESETS,
  computeBounds,
  normalizeVal,
  createProjectPoint,
  computeCubeLines,
  computeDominatedGeometry,
  projectDominatedBoundary,
} from './pareto3d/pareto3dMath';
import { Pareto3DToolbar } from './pareto3d/Pareto3DToolbar';

interface Pareto3DCloudProps {
  gpus: RankedGpu[];
  xMetric: MetricKey; // Base metric anchored at Bottom-Left (defaults to 'price' / Money $)
  yMetric: MetricKey;
  zMetric: MetricKey;
  extrapolation: ExtrapolationConfig;
  hoveredGpuId: string | null;
  selectedGpuIds: string[];
  isExpanded?: boolean;
  hideDominatedNodes?: boolean;
  showDominatedZoneMesh?: boolean;
  onToggleHideDominatedNodes?: () => void;
  onToggleDominatedZoneMesh?: () => void;
  onHoverGpu: (id: string | null) => void;
  onToggleSelectGpu: (id: string) => void;
  onChangeXMetric?: (m: MetricKey) => void;
  onChangeYMetric?: (m: MetricKey) => void;
  onChangeZMetric: (m: MetricKey) => void;
}

export const Pareto3DCloud: React.FC<Pareto3DCloudProps> = ({
  gpus,
  xMetric,
  yMetric,
  zMetric,
  extrapolation,
  hoveredGpuId,
  selectedGpuIds,
  isExpanded = false,
  hideDominatedNodes = false,
  showDominatedZoneMesh = true,
  onToggleHideDominatedNodes,
  onToggleDominatedZoneMesh,
  onHoverGpu,
  onToggleSelectGpu,
  onChangeXMetric,
  onChangeYMetric,
  onChangeZMetric,
}) => {
  const [yaw, setYaw] = useState<number>(25);
  const [pitch, setPitch] = useState<number>(22);
  const [activePreset, setActivePreset] = useState<CameraPresetId | 'custom'>(
    'iso',
  );
  const [zoom, setZoom] = useState<number>(1.05);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const svgContainerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    mode: 'none' | 'orbit' | 'pan';
    startX: number;
    startY: number;
    startYaw: number;
    startPitch: number;
    startPanX: number;
    startPanY: number;
  }>({
    mode: 'none',
    startX: 0,
    startY: 0,
    startYaw: 25,
    startPitch: 22,
    startPanX: 0,
    startPanY: 0,
  });

  useEffect(() => {
    const el = svgContainerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      setZoom((prev) => Math.max(0.45, Math.min(4.5, prev * factor)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const xDef = METRIC_DEFINITIONS[xMetric];
  const yDef = METRIC_DEFINITIONS[yMetric];
  const zDef = METRIC_DEFINITIONS[zMetric];

  const viewAxes = useMemo<MetricKey[]>(() => {
    if (activePreset === 'xy') return Array.from(new Set([xMetric, yMetric]));
    if (activePreset === 'xz') return Array.from(new Set([xMetric, zMetric]));
    return Array.from(new Set([xMetric, yMetric, zMetric]));
  }, [activePreset, xMetric, yMetric, zMetric]);

  const viewOptimalityMap = useMemo(() => {
    const evaluatedOnView = evaluateParetoFrontier(gpus, viewAxes);
    const sliceX = xMetric;
    const sliceY = activePreset === 'xz' ? zMetric : yMetric;
    const extrapEval = extrapolation.enabled
      ? evaluateLinearExtrapolation(gpus, sliceX, sliceY, extrapolation)
      : null;
    const belowMarginSet = new Set(extrapEval?.belowMarginIds ?? []);

    const map = new Map<
      string,
      { isViewOptimal: boolean; isBelowMargin: boolean }
    >();
    for (const item of evaluatedOnView) {
      const isBelowMargin = belowMarginSet.has(item.id);
      const isViewOptimal =
        item.isParetoOptimal &&
        !(
          extrapolation.enabled &&
          extrapolation.enforceAsTrap &&
          isBelowMargin
        );
      map.set(item.id, { isViewOptimal, isBelowMargin });
    }
    return map;
  }, [gpus, viewAxes, activePreset, xMetric, yMetric, zMetric, extrapolation]);

  const winnerGpu = useMemo(
    () =>
      gpus.find((g) => viewOptimalityMap.get(g.id)?.isViewOptimal) ??
      gpus[0] ??
      null,
    [gpus, viewOptimalityMap],
  );

  const bounds = useMemo(
    () => computeBounds(gpus, xMetric, yMetric, zMetric),
    [gpus, xMetric, yMetric, zMetric],
  );

  const projectPoint = useMemo(
    () =>
      createProjectPoint(
        yaw,
        pitch,
        zoom,
        pan,
        activePreset === 'xy' || activePreset === 'xz',
      ),
    [yaw, pitch, zoom, pan, activePreset],
  );

  const cubeLines = useMemo(
    () => computeCubeLines(projectPoint),
    [projectPoint],
  );

  // 3D voxel grid and unprojected boundary face geometry memoized independent of camera transforms (PERF-06)
  const dominatedGeometry = useMemo(
    () =>
      computeDominatedGeometry({
        gpus,
        viewOptimalityMap,
        xMetric,
        yMetric,
        zMetric,
        bounds,
        xDef,
        yDef,
        zDef,
        activePreset,
        showDominatedZoneMesh,
      }),
    [
      gpus,
      viewOptimalityMap,
      xMetric,
      yMetric,
      zMetric,
      bounds,
      xDef,
      yDef,
      zDef,
      activePreset,
      showDominatedZoneMesh,
    ],
  );

  // High-frequency viewport projection executed on camera rotations (yaw/pitch/zoom/pan)
  const mergedDominatedBoundary = useMemo(
    () => projectDominatedBoundary(dominatedGeometry, projectPoint),
    [dominatedGeometry, projectPoint],
  );

  const projectedGpus = useMemo(() => {
    const visibleGpus = hideDominatedNodes
      ? gpus.filter((g) => viewOptimalityMap.get(g.id)?.isViewOptimal)
      : gpus;

    return visibleGpus
      .map((gpu) => {
        const nx = normalizeVal(gpu[xMetric], bounds.x.min, bounds.x.max);
        const ny = normalizeVal(gpu[yMetric], bounds.y.min, bounds.y.max);
        const nz = normalizeVal(gpu[zMetric], bounds.z.min, bounds.z.max);

        const pos = projectPoint(nx, ny, nz);
        const floorPos = projectPoint(nx, -1, nz);
        const viewStatus = viewOptimalityMap.get(gpu.id) ?? {
          isViewOptimal: gpu.isParetoOptimal,
          isBelowMargin: false,
        };

        return {
          gpu,
          pos,
          floorPos,
          isViewOptimal: viewStatus.isViewOptimal,
          isBelowMargin: viewStatus.isBelowMargin,
        };
      })
      .sort((a, b) => b.pos.depthIntoScreen - a.pos.depthIntoScreen);
  }, [
    gpus,
    hideDominatedNodes,
    viewOptimalityMap,
    xMetric,
    yMetric,
    zMetric,
    bounds,
    projectPoint,
  ]);

  const axisLabels = useMemo(() => {
    const bestX = xDef.direction === 'min' ? -1 : 1;
    const bestY = yDef.direction === 'max' ? 1 : -1;
    const bestZ = zDef.direction === 'max' ? 1 : -1;
    return {
      origin: projectPoint(-1, -1, -1),
      xEnd: projectPoint(1.12, -1, -1),
      yEnd: projectPoint(-1, 1.14, -1),
      zEnd: projectPoint(-1, -1, 1.14),
      utopia: projectPoint(bestX, bestY, bestZ),
      antiUtopia: projectPoint(-bestX, -bestY, -bestZ),
    };
  }, [projectPoint, xDef.direction, yDef.direction, zDef.direction]);

  const handleApplyCameraPreset = (presetId: CameraPresetId) => {
    const found = CAMERA_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setActivePreset(presetId);
    setYaw(found.yaw);
    setPitch(found.pitch);
    setPan({ x: 0, y: 0 });
  };

  const handleInspectAxisAgainstBase = (targetMetric: MetricKey) => {
    if (targetMetric === yMetric) {
      handleApplyCameraPreset('xy');
    } else if (targetMetric === zMetric) {
      handleApplyCameraPreset('xz');
    } else {
      onChangeZMetric(targetMetric);
      handleApplyCameraPreset('xz');
    }
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const isPan = e.shiftKey || e.button === 1 || e.button === 2;
    dragRef.current = {
      mode: isPan ? 'pan' : 'orbit',
      startX: e.clientX,
      startY: e.clientY,
      startYaw: yaw,
      startPitch: pitch,
      startPanX: pan.x,
      startPanY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (dragRef.current.mode === 'none') return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    if (dragRef.current.mode === 'pan') {
      setPan({
        x: dragRef.current.startPanX + dx,
        y: dragRef.current.startPanY + dy,
      });
    } else {
      setActivePreset('custom');
      setYaw(dragRef.current.startYaw - dx * 0.45);
      setPitch(
        Math.max(-89, Math.min(89, dragRef.current.startPitch + dy * 0.35)),
      );
    }
  };

  const handleMouseUp = () => {
    dragRef.current.mode = 'none';
  };

  const viewOptimalCount = useMemo(
    () => gpus.filter((g) => viewOptimalityMap.get(g.id)?.isViewOptimal).length,
    [gpus, viewOptimalityMap],
  );

  const fmtVal = (def: typeof xDef, val: number) =>
    def.unit === '$' ? `$${Math.round(val)}` : `${Math.round(val)} ${def.unit}`;

  return (
    <div
      ref={svgContainerRef}
      className={`w-full ${
        isExpanded ? 'h-[82vh] min-h-[660px]' : 'h-[520px]'
      } relative select-none overflow-hidden rounded-xl bg-slate-950/50`}
    >
      <Pareto3DToolbar
        activePreset={activePreset}
        onApplyCameraPreset={handleApplyCameraPreset}
        xMetric={xMetric}
        yMetric={yMetric}
        zMetric={zMetric}
        xDef={xDef}
        yDef={yDef}
        zDef={zDef}
        onInspectAxisAgainstBase={handleInspectAxisAgainstBase}
        zoom={zoom}
        setZoom={setZoom}
        showDominatedZoneMesh={showDominatedZoneMesh}
        onToggleDominatedZoneMesh={onToggleDominatedZoneMesh}
        hideDominatedNodes={hideDominatedNodes}
        onToggleHideDominatedNodes={onToggleHideDominatedNodes}
        onChangeXMetric={onChangeXMetric}
        onChangeYMetric={onChangeYMetric}
        onChangeZMetric={onChangeZMetric}
        onResetCamera={() => {
          handleApplyCameraPreset('iso');
          setZoom(1.05);
        }}
      />

      {/* Main 3D Canvas */}
      <svg
        className="h-full w-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        viewBox="0 0 900 550"
      >
        <defs>
          <radialGradient id="winner3dGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </radialGradient>
          <filter id="soft3dGlow">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. Base Wireframe Cube */}
        <g opacity={0.65}>
          {cubeLines.map((edge) => {
            const isBase = edge.role === 'x-base';
            const isY = edge.role === 'y-axis';
            const isZ = edge.role === 'z-axis';
            const strokeColor = isBase
              ? '#10b981'
              : isY
                ? '#38bdf8'
                : isZ
                  ? '#a855f7'
                  : '#334155';
            const strokeWidth = isBase || isY || isZ ? 2.4 : 1;
            return (
              <line
                key={edge.id}
                x1={edge.p1.screenX}
                y1={edge.p1.screenY}
                x2={edge.p2.screenX}
                y2={edge.p2.screenY}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={edge.role === 'frame' ? '3,3' : undefined}
                opacity={edge.role === 'frame' ? 0.45 : 0.9}
              />
            );
          })}
        </g>

        {/* 2. 3D Dominated Volume Faces */}
        {showDominatedZoneMesh && (
          <g opacity={0.72}>
            {mergedDominatedBoundary.fillFaces.map((f) => (
              <polygon
                key={f.id}
                points={f.points}
                fill="#f43f5e"
                fillOpacity={f.isFrontierInterface ? 0.22 : 0.12}
                stroke="#f43f5e"
                strokeWidth={f.isFrontierInterface ? 0.9 : 0.4}
                strokeOpacity={f.isFrontierInterface ? 0.6 : 0.25}
              />
            ))}
          </g>
        )}

        {/* 3. Corner Step-Ticks */}
        {showDominatedZoneMesh && (
          <g opacity={0.85}>
            {mergedDominatedBoundary.cornerTicks.map((t) => (
              <g key={`corner-tick-${t.id}`}>
                <line
                  x1={t.origin.screenX}
                  y1={t.origin.screenY}
                  x2={t.tx.screenX}
                  y2={t.tx.screenY}
                  stroke="#34d399"
                  strokeWidth={1.4}
                  strokeOpacity={0.7}
                />
                <line
                  x1={t.origin.screenX}
                  y1={t.origin.screenY}
                  x2={t.ty.screenX}
                  y2={t.ty.screenY}
                  stroke="#38bdf8"
                  strokeWidth={1.4}
                  strokeOpacity={0.7}
                />
                <line
                  x1={t.origin.screenX}
                  y1={t.origin.screenY}
                  x2={t.tz.screenX}
                  y2={t.tz.screenY}
                  stroke="#c084fc"
                  strokeWidth={1.4}
                  strokeOpacity={0.7}
                />
              </g>
            ))}
          </g>
        )}

        {/* 4. Axis Labels & Direction Arrows */}
        <g>
          <text
            x={axisLabels.xEnd.screenX}
            y={axisLabels.xEnd.screenY + 14}
            fill="#34d399"
            fontSize="11"
            fontWeight="bold"
            textAnchor="middle"
          >
            Base: {xDef.shortLabel} →
          </text>
          <text
            x={axisLabels.yEnd.screenX}
            y={axisLabels.yEnd.screenY - 8}
            fill="#38bdf8"
            fontSize="11"
            fontWeight="bold"
            textAnchor="middle"
          >
            ↑ {yDef.shortLabel}
          </text>
          <text
            x={axisLabels.zEnd.screenX}
            y={axisLabels.zEnd.screenY - 8}
            fill="#c084fc"
            fontSize="11"
            fontWeight="bold"
            textAnchor="middle"
          >
            {zDef.shortLabel} ↗
          </text>

          <text
            x={axisLabels.origin.screenX - 8}
            y={axisLabels.origin.screenY + 16}
            fill="#10b981"
            fontSize="10"
            fontWeight="bold"
            textAnchor="end"
          >
            Origin (Min Base $)
          </text>
        </g>

        {/* 5. Projected GPU Nodes */}
        <g>
          {projectedGpus.map(
            ({ gpu, pos, floorPos, isViewOptimal, isBelowMargin }) => {
              const isHovered = hoveredGpuId === gpu.id;
              const isSelected = selectedGpuIds.includes(gpu.id);
              const isWinner = winnerGpu?.id === gpu.id;

              const radius = isWinner
                ? 9.5
                : isHovered
                  ? 8.5
                  : isSelected
                    ? 7.5
                    : 5.5;
              const nodeFill = isWinner
                ? '#10b981'
                : isViewOptimal
                  ? '#34d399'
                  : isBelowMargin
                    ? '#fb7185'
                    : '#f43f5e';
              const nodeStroke = isWinner
                ? '#ffffff'
                : isSelected
                  ? '#38bdf8'
                  : isHovered
                    ? '#ffffff'
                    : '#0f172a';
              const nodeStrokeWidth =
                isWinner || isSelected || isHovered ? 2.5 : 1.2;

              return (
                <g
                  key={gpu.id}
                  className="cursor-pointer transition-transform duration-150"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelectGpu(gpu.id);
                  }}
                  onMouseEnter={() => onHoverGpu(gpu.id)}
                  onMouseLeave={() => onHoverGpu(null)}
                >
                  {/* Floor drop-line */}
                  <line
                    x1={pos.screenX}
                    y1={pos.screenY}
                    x2={floorPos.screenX}
                    y2={floorPos.screenY}
                    stroke={isViewOptimal ? '#10b981' : '#f43f5e'}
                    strokeWidth={0.7}
                    strokeDasharray="2,3"
                    opacity={isHovered ? 0.8 : 0.3}
                  />
                  <circle
                    cx={floorPos.screenX}
                    cy={floorPos.screenY}
                    r={2}
                    fill="#475569"
                    opacity={0.5}
                  />

                  {isWinner && (
                    <circle
                      cx={pos.screenX}
                      cy={pos.screenY}
                      r={radius * 2.2}
                      fill="url(#winner3dGlow)"
                    />
                  )}

                  <circle
                    cx={pos.screenX}
                    cy={pos.screenY}
                    r={radius}
                    fill={nodeFill}
                    stroke={nodeStroke}
                    strokeWidth={nodeStrokeWidth}
                    filter={
                      isHovered || isWinner ? 'url(#soft3dGlow)' : undefined
                    }
                  />

                  {/* Node labels for key cards */}
                  {(isHovered || isSelected || isWinner) && (
                    <g pointerEvents="none">
                      <rect
                        x={pos.screenX + radius + 5}
                        y={pos.screenY - 14}
                        width={Math.max(70, gpu.name.length * 6.8 + 12)}
                        height={20}
                        rx={4}
                        fill="#090d16"
                        fillOpacity={0.92}
                        stroke={nodeFill}
                        strokeWidth={1}
                      />
                      <text
                        x={pos.screenX + radius + 11}
                        y={pos.screenY}
                        fill="#f8fafc"
                        fontSize="10"
                        fontWeight="bold"
                      >
                        {gpu.name}
                      </text>
                    </g>
                  )}
                </g>
              );
            },
          )}
        </g>
      </svg>

      {/* Bottom Status Tip */}
      <div className="absolute bottom-2 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pointer-events-none">
        <div className="pointer-events-auto rounded-lg border border-slate-800 bg-slate-950/90 px-2.5 py-1 text-[11px] backdrop-blur">
          <span className="text-emerald-400 font-bold">
            {viewOptimalCount} Optimal in View
          </span>
          <span className="text-slate-500 mx-1.5">•</span>
          <span className="text-rose-400 font-bold">
            {gpus.length - viewOptimalCount} Dominated
          </span>
          {winnerGpu && (
            <>
              <span className="text-slate-500 mx-1.5">•</span>
              <span className="text-slate-300">
                Top Value:{' '}
                <strong className="text-emerald-300">{winnerGpu.name}</strong> (
                {fmtVal(xDef, winnerGpu[xMetric])},{' '}
                {fmtVal(yDef, winnerGpu[yMetric])},{' '}
                {fmtVal(zDef, winnerGpu[zMetric])})
              </span>
            </>
          )}
        </div>
        <div className="pointer-events-auto rounded-lg border border-slate-800 bg-slate-950/90 px-2.5 py-1 text-[11px] text-slate-500">
          Drag to Orbit • Shift+Drag to Pan • Wheel to Zoom
        </div>
      </div>
    </div>
  );
};
