'use client'

import React, { useEffect, useMemo, useRef, useState } from "react";
import DeckGL from "@deck.gl/react";
import { Tile3DLayer } from "@deck.gl/geo-layers";
import { ScenegraphLayer } from "@deck.gl/mesh-layers";
import { PickingInfo } from "@deck.gl/core";
import Live from "@/components/map/mode/Live";
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import "react-toastify/dist/ReactToastify.css";
import { toast, ToastContainer } from "react-toastify";
import Archive from "@/components/map/mode/Archive";
import Counter from "@/components/map/Counter";

const apiHost = process.env.NEXT_PUBLIC_API_HOST || "http://localhost:8000"

type MapData = {
  position: [x: number, y: number, z: number];
  scale: number
  // normal: [nx: number, ny: number, nz: number];
  // color: [r: number, g: number, b: number];
};
type TimeLog = {
  start_time: string;
  end_time: string;
}

export default function Map() {
  const [openedMenu, setOpenedMenu] = useState(false)
  const [mapData, setMapData] = useState<Array<MapData>>([])
  const [onLive, setOnLive] = useState(false)
  const [onArchive, setOnArchive] = useState(false)
  const [archiveList, setArchiveList] = useState<Array<TimeLog>>([])
  const [openedArchiveList, setOpenedArchiveList] = useState(false)
  const [openedDownloadModal, setOpenedDownloadModal] = useState(false)
  const [count, setCount] = useState(0)
  const onLiveRef = useRef(false)
  const onArchiveRef = useRef(false)
  const [records, setRecords] = useState<string[]>([]);

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

  useEffect(() => {
    onArchiveRef.current = onArchive;
  }, [onArchive]);

  const fetchTelemetryLog = async () => {
    try {
      const response = await fetch(`${apiHost}/api/v1/telemetry_log`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json()
      setArchiveList(data.logs)
    } catch (error) {
      if (error instanceof Error) {
        console.error('error:', error);
        toast.error("取得エラー", {
          position: "top-right",
        })
      }
    } finally {
      setOpenedMenu(false)
    }
  }

  const fetchLiveStream = async () => {
    console.log("live stream")
    setCount(0)
    const controller = new AbortController();

    try {
      const response = await fetch(
        `${apiHost}/api/v1/stream/location/live`,
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
            setCount((prev)=>{return ++prev})
            recordTime(`${formatedData.position[0]},${formatedData.position[1]},${formatedData.position[2]}`)
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
      setCount(0)
      setOpenedDownloadModal(true)
    }
  };

  const fetchArchiveStream = async (span: TimeLog) => {
    setOpenedArchiveList(false)
    setCount(0)
    console.log("Archive stream")
    // const controller = new AbortController();

    try {
      const response = await fetch(
        `${apiHost}/api/v1/stream/location/archive`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            start_time: span.start_time,
            end_time: span.end_time,
          }),
          // signal: controller.signal,
        });
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
        if (!onArchiveRef.current) {
          console.log("Stream aborted");
          // controller.abort(); // リクエストを中断
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
            const formatedData: MapData = {position:[parsedData.longitude, parsedData.latitude, 100], scale: 3}
            setMapData((prevData) => [...prevData, formatedData]); // リアルタイム更新
            setCount((prev)=>{return ++prev})
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
      setOnArchive(false)
      setCount(0)
    }
  };

  console.log(mapData)
  console.log(records)
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
          fetchTelemetryLog()
          setOnArchive(true)
          setOnLive(false)
          setOpenedMenu(false)
          setOpenedArchiveList(true)
        }
      },
    ]
  },[])

  // 時間を記録する（マイクロ秒単位の精度）
  const recordTime = (data: string) => {
    const now = new Date(); // 現在日時を取得
    const time = now.toLocaleDateString("ja-JP") + " " + now.toLocaleTimeString("ja-JP");
    // performance.now() で高精度時間を取得（μsに近い値）
    const microseconds = Math.floor((performance.now() % 1000) * 1000); // ミリ秒からμsに変換
    // 記録する時間フォーマット
    const preciseTime = `${time}.${String(microseconds).padStart(6, "0")}`;

    const content = `${preciseTime},${data}`
    setRecords((prev) => [...prev, content]);
  };
  // CSVファイルを生成
  const generateCSV = () => {
    const header = "No,Time\n";
    const rows = records.map((time, index) => `${index + 1},${time}`).join("\n");
    const csvContent = header + rows;
    const fileName = `time_records_${generateTimestamp()}`

    downloadFile(csvContent, fileName, "text/csv");
    setOpenedDownloadModal(false)
    setRecords([])
  };

  // // LOGファイルを生成
  // const generateLog = () => {
  //   const logContent = records.map((time, index) => `[${index + 1}] ${time}`).join("\n");
  //   downloadFile(logContent, "time_records.log", "text/plain");
  // };

  // ファイルダウンロード用関数
  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateTimestamp = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0"); // 2桁にする
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
  
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
  };

  return (
    <div className="w-full h-full relative">
      {onLive && (
        <div className="absolute top-2 left-2 z-10">
          <Live />
        </div>
      )}
      {onArchive && (
        <div className="absolute top-2 left-2 z-10">
          <Archive />
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
      {
        openedArchiveList && (
          <div className="absolute top-0 left-0 w-screen h-screen bg-black bg-opacity-70 z-50 flex justify-center items-center" onClick={()=>{setOpenedArchiveList(false);setOnArchive(false)}}>
            <ul className="bg-white p-5 rounded-md flex flex-col items-center overflow-y-auto max-h-96" onClick={(event) => event.stopPropagation()}>
              {
                archiveList.map((span,i)=>(
                  <li className=" leading-none" key={i}>
                    <div
                      onClick={()=>fetchArchiveStream(span)}
                      className={`bg-white text-gray-700 text-xs w-4/5 h-30 hover:bg-gray-300`}
                      >
                      {i+1}:<br />
                      {span.start_time}<br />
                            ~         <br />
                      {span.end_time}
                    </div>
                    <hr className="w-full border-[1px] border-teal-700" />
                  </li>
                ))
              }
            </ul>
          </div>
        )
      }
      {
        openedDownloadModal && (
          <div className="absolute top-0 left-0 w-screen h-screen bg-black bg-opacity-70 z-50 flex justify-center items-center" onClick={()=>setOpenedMenu(false)}>
            <div className="bg-white p-5 rounded-md flex flex-col items-center space-y-5" onClick={(event) => event.stopPropagation()}>
              <button
                onClick={generateCSV}
                className={"bg-teal-500 text-black text-sm w-36 h-12 rounded-md hover:bg-teal-700"}
                >
                csvファイルをダウンロード
              </button>
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
      {(onLive || onArchive) && (
        <Counter num={count}/>
      )}
      <ToastContainer />
      </div>
  );
}
