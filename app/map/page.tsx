'use client'

import React, { useMemo, useState } from "react";
import DeckGL from "@deck.gl/react";
import { Tile3DLayer } from "@deck.gl/geo-layers";
import { ScenegraphLayer, SimpleMeshLayer } from "@deck.gl/mesh-layers";
import { PickingInfo } from "@deck.gl/core";
import Live from "@/components/map/mode/Live";
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';

export default function Map() {
  const [openedMenu, setOpenedMenu] = useState(false)
  const initialViewState = {
    // latitude: 31.568378,
    // longitude: 130.710540,
    latitude: 31.5965,
    longitude: 130.5571,
    zoom: 16,
    pitch: 50,
    bearing: 0,
  };

  // const scatterplotData = [
  //   { position: [130.5571, 31.5965, 100], elevation: 100, color: [255, 0, 0] },
  //   { position: [130.5581, 31.5965, 100], elevation: 100, color: [0, 255, 0] },
  //   { position: [130.5591, 31.5965, 100], elevation: 100, color: [0, 0, 255] },
  // ];
  // const columnData = [
  //   { position: [130.5571, 31.5965], radius: 5, height: 100, color: [255, 0, 0] },
  //   { position: [130.5581, 31.5965], radius: 5, height: 200, color: [0, 255, 0] },
  //   { position: [130.5591, 31.5965], radius: 5, height: 300, color: [0, 0, 255] },
  // ];
  const sphereData = [
    { position: [130.5571, 31.5965, 300], scale: 10 },
  ];

  const layers = [
    new Tile3DLayer({
      id: "tile-3d-layer",
      data: "https://tile.googleapis.com/v1/3dtiles/root.json",
      loadOptions: {
        fetch: {
          headers: {
            "X-GOOG-API-KEY": process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY, // 環境変数の適切な設定
          },
        },
      },
    }),
    // new ScatterplotLayer({
    //   id: "scatterplot-layer",
    //   data: scatterplotData,
    //   getPosition: (d) => d.position, // 緯度、経度を取得
    //   getFillColor: (d) => d.color, // 色の指定
    //   getElevation: (d: { elevation: any; }) => d.elevation, // 高度を取得
    //   radiusScale: 30, // 点の半径スケール
    //   radiusMinPixels: 20, // 最小半径
    //   elevationScale: 10, // 高度スケール
    //   extruded: true, // 押し出しを有効化（3D表現）
    //   parameters: {
    //     depthTest: false, // 深度テストを無効化
    //   },
    // }),
    new SimpleMeshLayer({
      id: 'SimpleMeshLayer',
      data: 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/bart-stations.json',
      
      getColor: (d) => [Math.sqrt(d.exits), 140, 0],
      getOrientation: () => [0, Math.random() * 180, 0],
      getPosition: (d) => d.coordinates,
      mesh: 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/humanoid_quad.obj',
      sizeScale: 30,
      pickable: true,
    }),
    // new ColumnLayer({
    //   id: "column-layer",
    //   data: columnData,
    //   diskResolution: 12, // 円柱のポリゴン詳細度
    //   getRadius: (d: { radius: number }) => d.radius, // 円柱の半径
    //   getPosition: (d) => d.position, // 中心位置（緯度、経度）
    //   getFillColor: (d) => d.color, // 色
    //   getElevation: (d) => d.height, // 高さ
    // }),
    new ScenegraphLayer({
      id: "scenegraph-layer",
      data: sphereData,
      scenegraph: "/sphere.glb", // モデルファイルのパス
      getPosition: (d) => d.position,
      getScale: (d) => [d.scale, d.scale, d.scale],
      // loaders: [OBJLoader]
    }),
  ];

  const mapMode = useMemo(()=>{
    return [
      {
        name: 'Live',
        func: () => {}
      },
      {
        name: 'Archive',
        func: () => {}
      },
    ]
  },[])

  return (
    <div className="w-full h-full relative">
      <div className="absolute top-2 left-2 z-10">
        <Live />
      </div>
      <div className="absolute top-2 right-2 z-10 bg-teal-500 p-1 rounded-md hover:bg-teal-700" onClick={()=>setOpenedMenu(true)}>
        <FormatListBulletedIcon className="text-4xl text-white" />
      </div>
      {
        openedMenu && (
          <div className="absolute top-0 left-0 w-screen h-screen bg-black bg-opacity-70 z-50 flex justify-center items-center" onClick={()=>setOpenedMenu(false)}>
            <div className="bg-white p-5 rounded-md flex flex-col items-center space-y-5" onClick={(event) => event.stopPropagation()}>
              {
                mapMode.map((mode,i)=>(
                  <button key={i} onClick={mode.func} className="bg-teal-500 text-black text-xl w-36 h-12 rounded-md hover:bg-teal-700">{mode.name}</button>
                ))
              }
            </div>
          </div>
        )
      }
      <DeckGL
        initialViewState={initialViewState}
        controller={true}
        getTooltip={({object}: PickingInfo) => object && object.name}
        layers={layers}
        style={{ width: "100%", height: "100%"}}
        />
      </div>
  );
}
