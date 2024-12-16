'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DeckGL from "@deck.gl/react";
import { Tile3DLayer } from "@deck.gl/geo-layers";
import { ScenegraphLayer } from "@deck.gl/mesh-layers";
import { PickingInfo } from "@deck.gl/core";
import Live from "@/components/map/mode/Live";
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import "react-toastify/dist/ReactToastify.css";
import { toast, ToastContainer } from "react-toastify";


type MapData = {
  position: [x: number, y: number, z: number];
  scale: number
  // normal: [nx: number, ny: number, nz: number];
  // color: [r: number, g: number, b: number];
};

export default function Map() {
  const [openedMenu, setOpenedMenu] = useState(false)
  const [mapData, setMapData] = useState<Array<MapData>>([])
  const [onLive, setOnLive] = useState(false)
  const [onArchive, setOnArchive] = useState(false)
  const onLiveRef = useRef(false)

  const initialViewState = {
    // latitude: 31.568378,
    // longitude: 130.710540,
    latitude: 31.57194,
    longitude: 130.545472,
    zoom: 16,
    pitch: 50,
    bearing: 0,
  };

  useEffect(() => {
    onLiveRef.current = onLive;
  }, [onLive]);

  const fetchLiveStream = useCallback(async () => {
    console.log("live stream")
    const controller = new AbortController();

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_HOST}/api/v1/stream/location/live`,
        { signal: controller.signal }
      );
      console.log(response)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      if (!reader) return
      toast.success("接続完了! 受信中...", {
        position: "top-right",
      })

      while (true) {
        // onLiveがfalseの場合は中断
        if (!onLiveRef.current) {
          console.log("Stream aborted");
          controller.abort(); // リクエストを中断
          break;
        }
        const { done, value } = await reader.read();
        if (done) break;

        // データをデコード
        buffer += decoder.decode(value, { stream: true });

        // 完全なJSONオブジェクトに変換
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? ""; // 最後の未完了部分を保持
        lines.forEach((line) => {
          if (line.trim()) {
            const parsedData = JSON.parse(line);
            console.log(parsedData)
            const formatedData: MapData = {position:[parsedData.longitude, parsedData.latitude, parsedData.altitude], scale: 3}
            setMapData((prevData) => [...prevData, formatedData]); // リアルタイム更新
            // console.log(mapData)
          }
        });
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log('Fetch aborted');
          toast.error("Live配信が中断しました。", {
            position: "top-right",
          })
        } else {
          console.error('Error fetching stream:', error.message);
          toast.error("接続エラー", {
            position: "top-right",
          })
        }
      } else {
        console.error('Unknown error:', error);
        toast.error("接続エラー", {
          position: "top-right",
        })
      }
    } finally {
      setMapData([])
      setOnLive(false)
    }
  },[]);

  console.log(mapData)
  // const sphereData = [
  //   { position: [130.5571, 31.5965, 300], scale: 10 },
  // ];

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
    // new SimpleMeshLayer({
    //   id: 'SimpleMeshLayer',
    //   data: 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/bart-stations.json',
      
    //   getColor: (d) => [Math.sqrt(d.exits), 140, 0],
    //   getOrientation: () => [0, Math.random() * 180, 0],
    //   getPosition: (d) => d.coordinates,
    //   mesh: 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/humanoid_quad.obj',
    //   sizeScale: 30,
    //   pickable: true,
    // }),
    // new ColumnLayer({
    //   id: "column-layer",
    //   data: columnData,
    //   diskResolution: 12, // 円柱のポリゴン詳細度
    //   getRadius: (d: { radius: number }) => d.radius, // 円柱の半径
    //   getPosition: (d) => d.position, // 中心位置（緯度、経度）
    //   getFillColor: (d) => d.color, // 色
    //   getElevation: (d) => d.height, // 高さ
    // }),
    new ScenegraphLayer<MapData>({
      id: "scenegraph-layer",
      data: mapData,
      scenegraph: "/sphere.glb", // モデルファイルのパス
      // scenegraph: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BoxAnimated/glTF-Binary/BoxAnimated.glb', // モデルファイルのパス
      getPosition: (d:MapData) => d.position,
      getScale: (d:MapData) => [d.scale, d.scale, d.scale],
      _lighting: 'pbr',
      pickable: true
    }),
    // new PointCloudLayer<DataType>({
    //   id: 'PointCloudLayer',
    //   data: 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/pointcloud.json',
      
    //   getColor: (d: DataType) => d.color,
    //   getNormal: (d: DataType) => d.normal,
    //   getPosition: (d: DataType) => d.position,
    //   pointSize: 2,
    //   coordinateOrigin: [130.55, 31.59, 100],
    //   coordinateSystem: COORDINATE_SYSTEM.METER_OFFSETS,
    //   pickable: true
    // }),
  ];

  const mapMode = useMemo(()=>{
    return [
      {
        name: 'Live',
        func: () => {
          setOnLive(true)
          setOnArchive(false)
          setOpenedMenu(false)
          fetchLiveStream()
        }
      },
      {
        name: 'Archive',
        func: () => {
          setOnArchive(true)
          setOnLive(false)
          setOpenedMenu(false)
        }
      },
    ]
  },[])

  return (
    <div className="w-full h-full relative">
      {onLive && (
        <div className="absolute top-2 left-2 z-10">
          <Live />
        </div>
      )}
      <div className="absolute top-2 right-2 z-10 bg-teal-500 p-1 rounded-md hover:bg-teal-700" onClick={()=>setOpenedMenu(true)}>
        <FormatListBulletedIcon className="text-4xl text-white" />
      </div>
      {
        openedMenu && (
          <div className="absolute top-0 left-0 w-screen h-screen bg-black bg-opacity-70 z-50 flex justify-center items-center" onClick={()=>setOpenedMenu(false)}>
            <div className="bg-white p-5 rounded-md flex flex-col items-center space-y-5" onClick={(event) => event.stopPropagation()}>
              {
                mapMode.map((mode,i)=>(
                  <button
                    key={i}
                    onClick={mode.func}
                    disabled={(mode.name === 'Live' && onLive) || (mode.name === 'Archive' && onArchive)}
                    className={`bg-teal-500 text-black text-xl w-36 h-12 rounded-md ${ (mode.name === 'Live' && onLive) || (mode.name === 'Archive' && onArchive) ? "opacity-50 cursor-not-allowed" : "hover:bg-teal-700"}`}
                    >
                    {mode.name}
                  </button>
                ))
              }
            </div>
          </div>
        )
      }
      <DeckGL
        initialViewState={initialViewState}
        controller
        getTooltip={({object}: PickingInfo) => object && object.name}
        layers={layers}
        style={{ width: "100%", height: "100%"}}
        />
      <ToastContainer />
      </div>
  );
}
