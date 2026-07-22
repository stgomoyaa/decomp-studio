import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@decomp-studio/server/router";
import "./styles.css";

const trpc = createTRPCReact<AppRouter>();
const apiUrl = apiUrlFromLocation() ?? import.meta.env.VITE_API_URL ?? "http://127.0.0.1:3001";
const projectDirStorageKey = "decomp-studio.projectDir";
const defaultProjectDir = projectDirFromLocation() ?? storedProjectDir() ?? import.meta.env.VITE_PROJECT_DIR ?? "";

function apiUrlFromLocation(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const value = new URLSearchParams(window.location.search).get("apiUrl");
  return value !== null && value.length > 0 ? value : null;
}

function projectDirFromLocation(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const value = new URLSearchParams(window.location.search).get("projectDir");
  return value !== null && value.length > 0 ? value : null;
}

function storedProjectDir(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const value = window.localStorage.getItem(projectDirStorageKey);
  return value !== null && value.length > 0 ? value : null;
}

function desktopBridge(): HackromStudioDesktopBridge | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.hackromStudio ?? null;
}

function AppProviders(): React.ReactElement {
  const [queryClient] = useState(() => new QueryClient());
  const trpcClient = useMemo(
    () => trpc.createClient({ links: [httpBatchLink({ url: `${apiUrl}/trpc` })] }),
    [],
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

type ViewId = "dashboard" | "encounters" | "build" | "map" | "species" | "moves" | "trainers" | "search";

interface BuildLogMessage {
  readonly projectDir: string;
  readonly chunk: string;
}

function App(): React.ReactElement {
  const [projectDir, setProjectDir] = useState(defaultProjectDir);
  const [activeView, setActiveView] = useState<ViewId>("dashboard");
  const [buildLog, setBuildLog] = useState<string[]>([]);
  const [selectedMap, setSelectedMap] = useState("MAP_ROUTE101");
  const [slotIndex, setSlotIndex] = useState(0);
  const [species, setSpecies] = useState("SPECIES_TREECKO");
  const [level, setLevel] = useState(5);
  const [selectedSpecies, setSelectedSpecies] = useState("SPECIES_TREECKO");
  const [speciesBaseHP, setSpeciesBaseHP] = useState(40);
  const [speciesBaseAttack, setSpeciesBaseAttack] = useState(45);
  const [speciesBaseDefense, setSpeciesBaseDefense] = useState(35);
  const [speciesBaseSpeed, setSpeciesBaseSpeed] = useState(70);
  const [speciesBaseSpAttack, setSpeciesBaseSpAttack] = useState(65);
  const [speciesBaseSpDefense, setSpeciesBaseSpDefense] = useState(55);
  const [speciesType1, setSpeciesType1] = useState("TYPE_GRASS");
  const [speciesType2, setSpeciesType2] = useState("TYPE_GRASS");
  const [speciesAbility1, setSpeciesAbility1] = useState("ABILITY_OVERGROW");
  const [speciesAbility2, setSpeciesAbility2] = useState("ABILITY_NONE");
  const [selectedMove, setSelectedMove] = useState("MOVE_POUND");
  const [moveEffect, setMoveEffect] = useState("EFFECT_HIT");
  const [movePower, setMovePower] = useState(40);
  const [moveType, setMoveType] = useState("TYPE_NORMAL");
  const [moveAccuracy, setMoveAccuracy] = useState(100);
  const [movePp, setMovePp] = useState(35);
  const hasProjectDir = projectDir.trim().length > 0;
  const canPickProjectDir = desktopBridge() !== null;

  const utils = trpc.useUtils();
  const inspect = trpc.projectInspect.useQuery({ projectDir }, { enabled: hasProjectDir, retry: false });
  const toolchain = trpc.toolchainCheck.useQuery({ cwd: projectDir }, { enabled: hasProjectDir, retry: false });
  const encounters = trpc.encountersList.useQuery({ projectDir }, { enabled: hasProjectDir, retry: false });
  const encounter = trpc.encountersGet.useQuery({ projectDir, map: selectedMap }, { enabled: hasProjectDir, retry: false });
  const speciesList = trpc.speciesList.useQuery({ projectDir }, { enabled: hasProjectDir, retry: false });
  const speciesDetail = trpc.speciesGet.useQuery({ projectDir, id: selectedSpecies }, { enabled: hasProjectDir, retry: false });
  const movesList = trpc.movesList.useQuery({ projectDir }, { enabled: hasProjectDir, retry: false });
  const moveDetail = trpc.movesGet.useQuery({ projectDir, id: selectedMove }, { enabled: hasProjectDir, retry: false });

  const buildMutation = trpc.buildRun.useMutation({
    onMutate: () => {
      setBuildLog((current) => [...current, `--- Build started ${new Date().toLocaleTimeString()} ---\n`]);
    },
    onSuccess: (result) => {
      setBuildLog((current) => [
        ...current,
        `\nBuild finished with exit ${String(result.exitCode)}\nROM: ${result.romPath}\nSHA1: ${result.romSha1 ?? "n/a"}\n`,
      ]);
    },
  });
  const runMutation = trpc.emulatorLaunch.useMutation();
  const updateEncounter = trpc.encountersUpdateSlot.useMutation({
    onSuccess: async () => {
      await utils.encountersGet.invalidate({ projectDir, map: selectedMap });
      await utils.encountersList.invalidate({ projectDir });
    },
  });
  const updateSpecies = trpc.speciesUpdate.useMutation({
    onSuccess: async () => {
      await utils.speciesGet.invalidate({ projectDir, id: selectedSpecies });
      await utils.speciesList.invalidate({ projectDir });
    },
  });
  const updateMove = trpc.movesUpdate.useMutation({
    onSuccess: async () => {
      await utils.movesGet.invalidate({ projectDir, id: selectedMove });
      await utils.movesList.invalidate({ projectDir });
    },
  });

  useEffect(() => {
    if (hasProjectDir) {
      window.localStorage.setItem(projectDirStorageKey, projectDir);
    }
  }, [hasProjectDir, projectDir]);

  useEffect(() => {
    const data = speciesDetail.data;
    if (data === undefined || data === null) {
      return;
    }
    setSpeciesBaseHP(data.baseHP ?? 0);
    setSpeciesBaseAttack(data.baseAttack ?? 0);
    setSpeciesBaseDefense(data.baseDefense ?? 0);
    setSpeciesBaseSpeed(data.baseSpeed ?? 0);
    setSpeciesBaseSpAttack(data.baseSpAttack ?? 0);
    setSpeciesBaseSpDefense(data.baseSpDefense ?? 0);
    setSpeciesType1(data.types?.[0] ?? "TYPE_NORMAL");
    setSpeciesType2(data.types?.[1] ?? "TYPE_NORMAL");
    setSpeciesAbility1(data.abilities?.[0] ?? "ABILITY_NONE");
    setSpeciesAbility2(data.abilities?.[1] ?? "ABILITY_NONE");
  }, [speciesDetail.data]);

  useEffect(() => {
    const data = moveDetail.data;
    if (data === undefined || data === null) {
      return;
    }
    setMoveEffect(data.effect ?? "EFFECT_HIT");
    setMovePower(data.power ?? 0);
    setMoveType(data.type ?? "TYPE_NORMAL");
    setMoveAccuracy(data.accuracy ?? 0);
    setMovePp(data.pp ?? 0);
  }, [moveDetail.data]);

  useEffect(() => {
    const wsUrl = apiUrl.replace(/^http/, "ws");
    const socket = new WebSocket(`${wsUrl}/ws/build`);
    socket.addEventListener("message", (event) => {
      const parsed = parseBuildLogMessage(event.data);
      if (parsed?.projectDir === projectDir) {
        setBuildLog((current) => [...current, parsed.chunk]);
      }
    });
    return () => {
      socket.close();
    };
  }, [projectDir]);

  const runBuild = (): void => {
    if (!hasProjectDir) {
      return;
    }
    buildMutation.mutate({ projectDir });
    setActiveView("build");
  };

  const applyEncounter = (): void => {
    if (!hasProjectDir) {
      return;
    }
    updateEncounter.mutate({
      projectDir,
      map: selectedMap,
      slotType: "land_mons",
      slotIndex,
      species,
      minLevel: level,
      maxLevel: level,
    });
  };

  const applySpecies = (): void => {
    if (!hasProjectDir) {
      return;
    }
    updateSpecies.mutate({
      projectDir,
      id: selectedSpecies,
      baseHP: speciesBaseHP,
      baseAttack: speciesBaseAttack,
      baseDefense: speciesBaseDefense,
      baseSpeed: speciesBaseSpeed,
      baseSpAttack: speciesBaseSpAttack,
      baseSpDefense: speciesBaseSpDefense,
      types: [speciesType1, speciesType2],
      abilities: [speciesAbility1, speciesAbility2],
    });
  };

  const applyMove = (): void => {
    if (!hasProjectDir) {
      return;
    }
    updateMove.mutate({
      projectDir,
      id: selectedMove,
      effect: moveEffect,
      power: movePower,
      type: moveType,
      accuracy: moveAccuracy,
      pp: movePp,
    });
  };

  const pickProjectDir = (): void => {
    const bridge = desktopBridge();
    if (bridge === null) {
      return;
    }
    void (async () => {
      const picked = await bridge.pickProjectDirectory();
      if (picked !== null) {
        setProjectDir(picked);
      }
    })();
  };

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} onChange={setActiveView} />
      <main className="main-panel">
        <TopBar activeView={activeView} projectDir={projectDir || "No project selected"} onBuild={runBuild} isBuilding={buildMutation.isPending} canBuild={hasProjectDir} />
        <div className="content">
          {activeView === "dashboard" && (
            <Dashboard
              projectDir={projectDir}
              onProjectDirChange={setProjectDir}
              canPickProjectDir={canPickProjectDir}
              onPickProjectDir={pickProjectDir}
              inspect={inspect.data}
              toolchain={toolchain.data}
              onBuild={runBuild}
              onRun={() => {
                runMutation.mutate({ projectDir });
              }}
              buildPending={buildMutation.isPending}
              hasProjectDir={hasProjectDir}
            />
          )}
          {activeView === "encounters" && (
            <EncountersView
              maps={encounters.data ?? []}
              selectedMap={selectedMap}
              onSelectedMapChange={setSelectedMap}
              encounter={encounter.data}
              slotIndex={slotIndex}
              onSlotIndexChange={setSlotIndex}
              species={species}
              onSpeciesChange={setSpecies}
              level={level}
              onLevelChange={setLevel}
              onApply={applyEncounter}
              isSaving={updateEncounter.isPending}
            />
          )}
          {activeView === "build" && (
            <BuildView
              log={buildLog.join("")}
              diagnostics={buildMutation.data?.diagnostics ?? []}
              onClear={() => {
                setBuildLog([]);
              }}
              onRun={() => {
                runMutation.mutate({ projectDir });
              }}
            />
          )}
          {activeView === "map" && <Placeholder title="Map Editor" milestone="M5-M7" />}
          {activeView === "species" && (
            <SpeciesEditorView
              species={speciesList.data ?? []}
              selectedSpecies={selectedSpecies}
              onSelectedSpeciesChange={setSelectedSpecies}
              baseHP={speciesBaseHP}
              onBaseHPChange={setSpeciesBaseHP}
              baseAttack={speciesBaseAttack}
              onBaseAttackChange={setSpeciesBaseAttack}
              baseDefense={speciesBaseDefense}
              onBaseDefenseChange={setSpeciesBaseDefense}
              baseSpeed={speciesBaseSpeed}
              onBaseSpeedChange={setSpeciesBaseSpeed}
              baseSpAttack={speciesBaseSpAttack}
              onBaseSpAttackChange={setSpeciesBaseSpAttack}
              baseSpDefense={speciesBaseSpDefense}
              onBaseSpDefenseChange={setSpeciesBaseSpDefense}
              type1={speciesType1}
              onType1Change={setSpeciesType1}
              type2={speciesType2}
              onType2Change={setSpeciesType2}
              ability1={speciesAbility1}
              onAbility1Change={setSpeciesAbility1}
              ability2={speciesAbility2}
              onAbility2Change={setSpeciesAbility2}
              onApply={applySpecies}
              isSaving={updateSpecies.isPending}
            />
          )}
          {activeView === "moves" && (
            <MoveEditorView
              moves={movesList.data ?? []}
              selectedMove={selectedMove}
              onSelectedMoveChange={setSelectedMove}
              effect={moveEffect}
              onEffectChange={setMoveEffect}
              power={movePower}
              onPowerChange={setMovePower}
              type={moveType}
              onTypeChange={setMoveType}
              accuracy={moveAccuracy}
              onAccuracyChange={setMoveAccuracy}
              pp={movePp}
              onPpChange={setMovePp}
              onApply={applyMove}
              isSaving={updateMove.isPending}
            />
          )}
          {activeView === "trainers" && <Placeholder title="Trainer Editor" milestone="M4" />}
          {activeView === "search" && <Placeholder title="Text Search/Replace" milestone="M4" />}
        </div>
      </main>
    </div>
  );
}

function Sidebar({ activeView, onChange }: { activeView: ViewId; onChange: (view: ViewId) => void }): React.ReactElement {
  const items: readonly { id: ViewId; icon: string; title: string }[] = [
    { id: "dashboard", icon: "space_dashboard", title: "Dashboard" },
    { id: "encounters", icon: "grass", title: "Encounters" },
    { id: "build", icon: "terminal", title: "Build" },
    { id: "map", icon: "map", title: "Map Editor" },
    { id: "species", icon: "pets", title: "Species" },
    { id: "moves", icon: "bolt", title: "Moves" },
    { id: "trainers", icon: "sports_martial_arts", title: "Trainers" },
    { id: "search", icon: "find_replace", title: "Text" },
  ];

  return (
    <aside className="sidebar">
      <div className="logo">H</div>
      <nav className="nav-stack">
        {items.map((item) => (
          <button
            key={item.id}
            className={`nav-button ${activeView === item.id ? "active" : ""}`}
            onClick={() => {
              onChange(item.id);
            }}
            title={item.title}
            type="button"
          >
            <span className="material-symbols-outlined">{item.icon}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

function TopBar({ activeView, projectDir, onBuild, isBuilding, canBuild }: { activeView: ViewId; projectDir: string; onBuild: () => void; isBuilding: boolean; canBuild: boolean }): React.ReactElement {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="view-title">{activeViewTitle(activeView)}</span>
        <span className="divider" />
        <span className="project-chip">{projectDir}</span>
      </div>
      <button className="btn btn-primary" onClick={onBuild} disabled={isBuilding || !canBuild} type="button">
        <span className="material-symbols-outlined small">{isBuilding ? "progress_activity" : "play_arrow"}</span>
        {isBuilding ? "Building..." : "Build & Run"}
      </button>
    </header>
  );
}

function Dashboard({
  projectDir,
  onProjectDirChange,
  canPickProjectDir,
  onPickProjectDir,
  inspect,
  toolchain,
  onBuild,
  onRun,
  buildPending,
  hasProjectDir,
}: {
  projectDir: string;
  onProjectDirChange: (value: string) => void;
  canPickProjectDir: boolean;
  onPickProjectDir: () => void;
  inspect: unknown;
  toolchain: { ok: boolean; tools: readonly { name: string; ok: boolean; version: string | null; fix: string | null }[] } | undefined;
  onBuild: () => void;
  onRun: () => void;
  buildPending: boolean;
  hasProjectDir: boolean;
}): React.ReactElement {
  const project = asProjectInspect(inspect);
  return (
    <section className="dashboard-grid">
      <div className="panel span-2">
        <div className="panel-title">Project</div>
        <label className="field-label" htmlFor="projectDir">Project directory</label>
        <div className="field-row">
          <input id="projectDir" className="input mono" value={projectDir} placeholder="Choose a pokeemerald clone..." onChange={(event) => {
            onProjectDirChange(event.target.value);
          }} />
          {canPickProjectDir && <button className="btn btn-secondary" onClick={onPickProjectDir} type="button">Browse...</button>}
        </div>
        <div className="status-grid">
          <StatusCard label="Base" value={project?.base ?? "unknown"} tone={project?.base === "pokeemerald" ? "ok" : "warn"} />
          <StatusCard label="Pinned commit" value={project?.isPinnedCommit ? "match" : "mismatch"} tone={project?.isPinnedCommit ? "ok" : "warn"} />
          <StatusCard label="project.json" value={project?.hasProjectConfig ? "present" : "not initialized"} tone={project?.hasProjectConfig ? "ok" : "warn"} />
        </div>
      </div>
      <div className="panel">
        <div className="panel-title">Actions</div>
        <button className="btn btn-primary wide" onClick={onBuild} disabled={buildPending || !hasProjectDir} type="button">Build ROM</button>
        <button className="btn btn-secondary wide" onClick={onRun} disabled={!hasProjectDir} type="button">Open in mGBA</button>
      </div>
      <div className="panel span-3">
        <div className="panel-title">Toolchain Doctor</div>
        <div className="tool-list">
          {(toolchain?.tools ?? []).map((tool) => (
            <div key={tool.name} className="tool-row">
              <span className={tool.ok ? "dot ok" : "dot error"} />
              <span className="mono">{tool.name}</span>
              <span className="muted">{tool.version ?? tool.fix}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EncountersView({
  maps,
  selectedMap,
  onSelectedMapChange,
  encounter,
  slotIndex,
  onSlotIndexChange,
  species,
  onSpeciesChange,
  level,
  onLevelChange,
  onApply,
  isSaving,
}: {
  maps: readonly { map: string; slots: readonly string[] }[];
  selectedMap: string;
  onSelectedMapChange: (value: string) => void;
  encounter: unknown;
  slotIndex: number;
  onSlotIndexChange: (value: number) => void;
  species: string;
  onSpeciesChange: (value: string) => void;
  level: number;
  onLevelChange: (value: number) => void;
  onApply: () => void;
  isSaving: boolean;
}): React.ReactElement {
  const entry = asEncounterEntry(encounter);
  const landMons = entry?.land_mons?.mons ?? [];
  return (
    <div className="split-view">
      <aside className="list-panel">
        <div className="panel-title sticky-title">Maps</div>
        {maps.map((item, index) => (
          <button key={`${item.map}-${String(index)}`} className={`list-item ${item.map === selectedMap ? "active" : ""}`} onClick={() => {
            onSelectedMapChange(item.map);
          }} type="button">
            <span className="mono">{item.map}</span>
            <span className="muted">{item.slots.join(", ")}</span>
          </button>
        ))}
      </aside>
      <section className="detail-panel">
        <div className="panel-title">{selectedMap}</div>
        <div className="encounter-table">
          {landMons.map((mon, index) => (
            <button key={`${mon.species}-${String(index)}`} className={`encounter-row ${slotIndex === index ? "active" : ""}`} onClick={() => {
              onSlotIndexChange(index);
              onSpeciesChange(mon.species);
              onLevelChange(mon.min_level);
            }} type="button">
              <span className="mono slot">#{String(index)}</span>
              <span className="mono species">{mon.species}</span>
              <span className="muted">Lv {String(mon.min_level)}-{String(mon.max_level)}</span>
            </button>
          ))}
        </div>
      </section>
      <aside className="inspector-panel">
        <div className="panel-title">Edit Slot</div>
        <label className="field-label" htmlFor="slotIndex">Slot index</label>
        <input id="slotIndex" className="input mono" value={String(slotIndex)} onChange={(event) => {
          onSlotIndexChange(parseNumber(event.target.value));
        }} />
        <label className="field-label" htmlFor="species">Species</label>
        <input id="species" className="input mono" value={species} onChange={(event) => {
          onSpeciesChange(event.target.value);
        }} />
        <label className="field-label" htmlFor="level">Level</label>
        <input id="level" className="input mono" value={String(level)} onChange={(event) => {
          onLevelChange(parseNumber(event.target.value));
        }} />
        <button className="btn btn-primary wide" onClick={onApply} disabled={isSaving} type="button">Apply with checkpoint</button>
      </aside>
    </div>
  );
}

interface SpeciesEditorItem {
  readonly id: string;
  readonly editable: boolean;
  readonly baseHP?: number;
  readonly baseAttack?: number;
  readonly baseDefense?: number;
  readonly baseSpeed?: number;
  readonly baseSpAttack?: number;
  readonly baseSpDefense?: number;
  readonly types?: readonly string[];
  readonly abilities?: readonly string[];
}

function SpeciesEditorView({
  species,
  selectedSpecies,
  onSelectedSpeciesChange,
  baseHP,
  onBaseHPChange,
  baseAttack,
  onBaseAttackChange,
  baseDefense,
  onBaseDefenseChange,
  baseSpeed,
  onBaseSpeedChange,
  baseSpAttack,
  onBaseSpAttackChange,
  baseSpDefense,
  onBaseSpDefenseChange,
  type1,
  onType1Change,
  type2,
  onType2Change,
  ability1,
  onAbility1Change,
  ability2,
  onAbility2Change,
  onApply,
  isSaving,
}: {
  species: readonly SpeciesEditorItem[];
  selectedSpecies: string;
  onSelectedSpeciesChange: (value: string) => void;
  baseHP: number;
  onBaseHPChange: (value: number) => void;
  baseAttack: number;
  onBaseAttackChange: (value: number) => void;
  baseDefense: number;
  onBaseDefenseChange: (value: number) => void;
  baseSpeed: number;
  onBaseSpeedChange: (value: number) => void;
  baseSpAttack: number;
  onBaseSpAttackChange: (value: number) => void;
  baseSpDefense: number;
  onBaseSpDefenseChange: (value: number) => void;
  type1: string;
  onType1Change: (value: string) => void;
  type2: string;
  onType2Change: (value: string) => void;
  ability1: string;
  onAbility1Change: (value: string) => void;
  ability2: string;
  onAbility2Change: (value: string) => void;
  onApply: () => void;
  isSaving: boolean;
}): React.ReactElement {
  return (
    <div className="split-view wide-editor">
      <aside className="list-panel">
        <div className="panel-title sticky-title">Species</div>
        {species.filter((item) => item.editable).map((item) => (
          <button key={item.id} className={`list-item ${item.id === selectedSpecies ? "active" : ""}`} onClick={() => {
            onSelectedSpeciesChange(item.id);
          }} type="button">
            <span className="mono">{item.id}</span>
            <span className="muted">BST {String(sumNumbers([item.baseHP, item.baseAttack, item.baseDefense, item.baseSpeed, item.baseSpAttack, item.baseSpDefense]))}</span>
          </button>
        ))}
      </aside>
      <section className="detail-panel editor-form">
        <div className="panel-title">{selectedSpecies}</div>
        <div className="form-grid">
          <NumberField id="speciesBaseHP" label="HP" value={baseHP} onChange={onBaseHPChange} />
          <NumberField id="speciesBaseAttack" label="Attack" value={baseAttack} onChange={onBaseAttackChange} />
          <NumberField id="speciesBaseDefense" label="Defense" value={baseDefense} onChange={onBaseDefenseChange} />
          <NumberField id="speciesBaseSpeed" label="Speed" value={baseSpeed} onChange={onBaseSpeedChange} />
          <NumberField id="speciesBaseSpAttack" label="Sp. Attack" value={baseSpAttack} onChange={onBaseSpAttackChange} />
          <NumberField id="speciesBaseSpDefense" label="Sp. Defense" value={baseSpDefense} onChange={onBaseSpDefenseChange} />
        </div>
        <div className="form-grid two-col">
          <TextField id="speciesType1" label="Type 1" value={type1} onChange={onType1Change} />
          <TextField id="speciesType2" label="Type 2" value={type2} onChange={onType2Change} />
          <TextField id="speciesAbility1" label="Ability 1" value={ability1} onChange={onAbility1Change} />
          <TextField id="speciesAbility2" label="Ability 2" value={ability2} onChange={onAbility2Change} />
        </div>
        <button className="btn btn-primary editor-save" onClick={onApply} disabled={isSaving} type="button">
          {isSaving ? "Saving..." : "Apply with checkpoint"}
        </button>
      </section>
    </div>
  );
}

interface MoveEditorItem {
  readonly id: string;
  readonly effect?: string;
  readonly power?: number;
  readonly type?: string;
  readonly accuracy?: number;
  readonly pp?: number;
}

function MoveEditorView({
  moves,
  selectedMove,
  onSelectedMoveChange,
  effect,
  onEffectChange,
  power,
  onPowerChange,
  type,
  onTypeChange,
  accuracy,
  onAccuracyChange,
  pp,
  onPpChange,
  onApply,
  isSaving,
}: {
  moves: readonly MoveEditorItem[];
  selectedMove: string;
  onSelectedMoveChange: (value: string) => void;
  effect: string;
  onEffectChange: (value: string) => void;
  power: number;
  onPowerChange: (value: number) => void;
  type: string;
  onTypeChange: (value: string) => void;
  accuracy: number;
  onAccuracyChange: (value: number) => void;
  pp: number;
  onPpChange: (value: number) => void;
  onApply: () => void;
  isSaving: boolean;
}): React.ReactElement {
  return (
    <div className="split-view wide-editor">
      <aside className="list-panel">
        <div className="panel-title sticky-title">Moves</div>
        {moves.map((move) => (
          <button key={move.id} className={`list-item ${move.id === selectedMove ? "active" : ""}`} onClick={() => {
            onSelectedMoveChange(move.id);
          }} type="button">
            <span className="mono">{move.id}</span>
            <span className="muted">{move.type ?? "TYPE_UNKNOWN"} / Power {String(move.power ?? 0)}</span>
          </button>
        ))}
      </aside>
      <section className="detail-panel editor-form">
        <div className="panel-title">{selectedMove}</div>
        <div className="form-grid two-col">
          <TextField id="moveEffect" label="Effect" value={effect} onChange={onEffectChange} />
          <TextField id="moveType" label="Type" value={type} onChange={onTypeChange} />
          <NumberField id="movePower" label="Power" value={power} onChange={onPowerChange} />
          <NumberField id="moveAccuracy" label="Accuracy" value={accuracy} onChange={onAccuracyChange} />
          <NumberField id="movePp" label="PP" value={pp} onChange={onPpChange} />
        </div>
        <button className="btn btn-primary editor-save" onClick={onApply} disabled={isSaving} type="button">
          {isSaving ? "Saving..." : "Apply with checkpoint"}
        </button>
      </section>
    </div>
  );
}

function NumberField({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (value: number) => void }): React.ReactElement {
  return (
    <div>
      <label className="field-label" htmlFor={id}>{label}</label>
      <input id={id} className="input mono" value={String(value)} onChange={(event) => {
        onChange(parseNumber(event.target.value));
      }} />
    </div>
  );
}

function TextField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }): React.ReactElement {
  return (
    <div>
      <label className="field-label" htmlFor={id}>{label}</label>
      <input id={id} className="input mono" value={value} onChange={(event) => {
        onChange(event.target.value);
      }} />
    </div>
  );
}

function sumNumbers(values: readonly (number | undefined)[]): number {
  let sum = 0;
  for (const value of values) {
    sum += value ?? 0;
  }
  return sum;
}

function BuildView({ log, diagnostics, onClear, onRun }: { log: string; diagnostics: readonly { message: string; severity: string }[]; onClear: () => void; onRun: () => void }): React.ReactElement {
  return (
    <div className="build-view">
      <div className="build-actions">
        <button className="btn btn-secondary" onClick={onClear} type="button">Clear</button>
        <button className="btn btn-primary" onClick={onRun} type="button">Run ROM</button>
      </div>
      <pre className="terminal">{log || "Build logs will stream here via WebSocket."}</pre>
      {diagnostics.length > 0 && (
        <div className="panel diagnostics">
          <div className="panel-title">Diagnostics</div>
          {diagnostics.map((diagnostic, index) => (
            <div key={String(index)} className="tool-row"><span className="dot error" /><span>{diagnostic.severity}</span><span className="muted">{diagnostic.message}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}

function Placeholder({ title, milestone }: { title: string; milestone: string }): React.ReactElement {
  return (
    <div className="placeholder panel">
      <span className="material-symbols-outlined placeholder-icon">construction</span>
      <h2>{title}</h2>
      <p>UI reservado para {milestone}. M2 se limita a dashboard, build/run y encounters.</p>
    </div>
  );
}

function StatusCard({ label, value, tone }: { label: string; value: string; tone: "ok" | "warn" }): React.ReactElement {
  return (
    <div className="status-card">
      <span className={`dot ${tone}`} />
      <span className="muted">{label}</span>
      <strong className="mono">{value}</strong>
    </div>
  );
}

function activeViewTitle(view: ViewId): string {
  const titles: Record<ViewId, string> = {
    dashboard: "Dashboard",
    encounters: "Encounters",
    build: "Build & Run",
    map: "Map Editor",
    species: "Species Editor",
    moves: "Move Editor",
    trainers: "Trainer Editor",
    search: "Text Search/Replace",
  };
  return titles[view];
}

function parseBuildLogMessage(value: unknown): BuildLogMessage | null {
  if (typeof value !== "string") {
    return null;
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "projectDir" in parsed &&
      "chunk" in parsed &&
      typeof parsed.projectDir === "string" &&
      typeof parsed.chunk === "string"
    ) {
      return { projectDir: parsed.projectDir, chunk: parsed.chunk };
    }
  } catch {
    return null;
  }
  return null;
}

function asProjectInspect(value: unknown): { base: string; isPinnedCommit: boolean; hasProjectConfig: boolean } | null {
  if (typeof value === "object" && value !== null && "base" in value && "isPinnedCommit" in value && "hasProjectConfig" in value) {
    return {
      base: String(value.base),
      isPinnedCommit: Boolean(value.isPinnedCommit),
      hasProjectConfig: Boolean(value.hasProjectConfig),
    };
  }
  return null;
}

interface EncounterEntryView {
  readonly land_mons?: { readonly mons: readonly { readonly min_level: number; readonly max_level: number; readonly species: string }[] };
}

function asEncounterEntry(value: unknown): EncounterEntryView | null {
  if (typeof value === "object" && value !== null) {
    return value;
  }
  return null;
}

function parseNumber(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

createRoot(document.getElementById("root") as HTMLElement).render(<AppProviders />);
