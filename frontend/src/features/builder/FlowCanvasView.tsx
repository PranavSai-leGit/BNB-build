import React, { useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  MarkerType,
  useNodesState,
  useEdgesState,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ExperimentNode, ExperimentEdge } from '../../types/experiment';
import { CustomFlowNode } from './CustomFlowNode';

interface FlowCanvasViewProps {
  nodes: ExperimentNode[];
  edges: ExperimentEdge[];
  selectedNodeId: string | null;
  onSelectNode: (node: ExperimentNode | null) => void;
  onUpdateNodes: (nodes: ExperimentNode[]) => void;
  onUpdateEdges: (edges: ExperimentEdge[]) => void;
}

const nodeTypes = {
  custom: CustomFlowNode,
};

export const FlowCanvasView: React.FC<FlowCanvasViewProps> = ({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  onUpdateNodes,
  onUpdateEdges,
}) => {
  // Helper to convert ExperimentNode to ReactFlow Node
  const toRfNode = useCallback((n: ExperimentNode, index: number, isSelected: boolean): Node => ({
    id: n.id,
    type: 'custom',
    position: n.position && typeof n.position.x === 'number'
      ? n.position
      : { x: 260, y: index * 140 + 40 },
    data: {
      id: n.id,
      type: n.type,
      label: n.label,
      props: n.props,
    },
    selected: isSelected,
  }), []);

  // Helper to convert ExperimentEdge to ReactFlow Edge
  const toRfEdge = useCallback((e: ExperimentEdge): Edge => {
    const fromId = (e as any).from || (e as any).from_node;
    const toId = (e as any).to || (e as any).to_node;
    const branch = e.branch || 'default';
    const isYes = branch === 'true' || branch === 'YES';
    const isNo = branch === 'false' || branch === 'NO';

    const strokeColor = isYes ? '#10b981' : isNo ? '#f43f5e' : '#6366f1';
    const labelText = isYes ? 'YES' : isNo ? 'NO' : branch !== 'default' ? branch : undefined;

    return {
      id: e.id || `edge_${fromId}_${toId}`,
      source: fromId,
      target: toId,
      sourceHandle: isYes ? 'true' : isNo ? 'false' : undefined,
      animated: isYes || isNo,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: strokeColor,
        width: 16,
        height: 16,
      },
      style: {
        stroke: strokeColor,
        strokeWidth: 2.5,
      },
      label: labelText,
      labelStyle: {
        fill: isYes ? '#10b981' : isNo ? '#f43f5e' : '#cbd5e1',
        fontWeight: 700,
        fontSize: 10,
        fontFamily: 'monospace',
      },
      labelBgStyle: {
        fill: '#0f172a',
        fillOpacity: 0.85,
        stroke: strokeColor,
        strokeWidth: 1,
        rx: 4,
        ry: 4,
      },
      labelBgPadding: [4, 2] as [number, number],
      data: { branch },
    };
  }, []);

  // Local ReactFlow states for high-frequency interactive canvas operations
  const [rfNodes, setRfNodes, onNodesChangeInternal] = useNodesState(
    nodes.map((n, i) => toRfNode(n, i, n.id === selectedNodeId))
  );

  const [rfEdges, setRfEdges, onEdgesChangeInternal] = useEdgesState(
    edges.map((e) => toRfEdge(e))
  );

  // Sync incoming nodes from parent (e.g. added from library or edited in inspector)
  useEffect(() => {
    setRfNodes((currentRfNodes) => {
      return nodes.map((n, i) => {
        const existing = currentRfNodes.find((rf) => rf.id === n.id);
        const position = n.position || (existing ? existing.position : { x: 260, y: i * 140 + 40 });
        return {
          id: n.id,
          type: 'custom',
          position,
          data: {
            id: n.id,
            type: n.type,
            label: n.label,
            props: n.props,
          },
          selected: n.id === selectedNodeId,
        };
      });
    });
  }, [nodes, selectedNodeId, setRfNodes]);

  // Sync incoming edges from parent
  useEffect(() => {
    setRfEdges(edges.map((e) => toRfEdge(e)));
  }, [edges, toRfEdge, setRfEdges]);

  // Handle local node changes (drag coords, selection)
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeInternal(changes);
    },
    [onNodesChangeInternal]
  );

  // When drag stops, commit node positions to parent definition
  const handleNodeDragStop = useCallback(
    (_: any, draggedNode: Node) => {
      const updated = nodes.map((n) => {
        if (n.id === draggedNode.id) {
          return {
            ...n,
            position: { x: Math.round(draggedNode.position.x), y: Math.round(draggedNode.position.y) },
          };
        }
        return n;
      });
      onUpdateNodes(updated);
    },
    [nodes, onUpdateNodes]
  );

  // Handle edge deletions or changes
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChangeInternal(changes);

      // If edges were removed, notify parent
      const removeChanges = changes.filter((c) => c.type === 'remove');
      if (removeChanges.length > 0) {
        const removedIds = new Set(removeChanges.map((c: any) => c.id));
        const updated = edges.filter((e) => !removedIds.has(e.id));
        onUpdateEdges(updated);
      }
    },
    [edges, onEdgesChangeInternal, onUpdateEdges]
  );

  // Handle new connection between handles
  const handleConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        // Prevent self-loop
        if (params.source === params.target) return;

        const branch = params.sourceHandle === 'true' ? 'true' : params.sourceHandle === 'false' ? 'false' : 'default';

        // Check if edge already exists with same branch
        const exists = edges.some(
          (e) =>
            ((e as any).from === params.source || (e as any).from_node === params.source) &&
            ((e as any).to === params.target || (e as any).to_node === params.target) &&
            e.branch === branch
        );
        if (exists) return;

        const newEdge: ExperimentEdge = {
          id: `edge_${params.source}_${params.target}_${Date.now()}`,
          from: params.source,
          to: params.target,
          branch,
        };

        const updatedEdges = [...edges, newEdge];
        onUpdateEdges(updatedEdges);
      }
    },
    [edges, onUpdateEdges]
  );

  const handleNodeClick = (_: any, node: Node) => {
    const matched = nodes.find((n) => n.id === node.id);
    if (matched) {
      onSelectNode(matched);
    }
  };

  const handlePaneClick = () => {
    onSelectNode(null);
  };

  return (
    <div className="flex-1 h-full w-full bg-cogni-dark relative">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onNodeDragStop={handleNodeDragStop}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        fitView
        fitViewOptions={{ padding: 0.25 }}
      >
        <Background color="#334155" gap={20} size={1} />
        <Controls className="!bg-cogni-panel !border-slate-800 !text-slate-300" />
        <MiniMap
          nodeColor={(node) => {
            const type = (node.data?.type as string) || '';
            if (type === 'start') return '#10b981';
            if (type === 'completion') return '#14b8a6';
            if (type === 'condition') return '#06b6d4';
            if (type === 'response') return '#f59e0b';
            if (type === 'randomization') return '#c084fc';
            return '#6366f1';
          }}
          className="!bg-cogni-panel !border-slate-800 !rounded-xl overflow-hidden"
          maskColor="rgba(9, 13, 22, 0.7)"
        />
      </ReactFlow>
    </div>
  );
};
