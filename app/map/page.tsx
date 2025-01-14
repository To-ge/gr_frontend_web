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
  location_count: number;
}
type LocalTimeLog = {
  start_time: number;
  end_time: number;
}
type LocalLocationLog = {
  unixTime: number,
  latitude: number,
  longitude: number,
  altitude: number,
}

const localStoragekeyPrefix = {
  timestamp: "span",
  location: "location"
}

type Flags = {
  [key: number]: boolean; // 任意の文字列キーに対する型を定義
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
  const [localTimeLogs, setLocalTimeLogs] = useState<LocalTimeLog[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number|null>(null)
  const [flags, setFlags] = useState<Flags>({}) // ローカルデータをダウンロードしたかどうかのフラグ
  const [isLoading, setIsLoading] = useState(false)

  const initialViewState = {
    // latitude: 31.568378,鹿児島市
    // longitude: 130.710540,
    // latitude: 31.57194,鹿児島大
    // longitude: 130.545472,
    latitude: 31.5707,
    longitude: 130.54348,
    zoom: 18,
    pitch: 50,
    bearing: 0,
  };

  useEffect(()=>{ // テスト用
    const time = 1111112111111
    const data: LocalLocationLog = {unixTime: time/1000, latitude: 0.0, longitude: 0.0, altitude: 0.0}
    localStorage.setItem(`${localStoragekeyPrefix.timestamp}_${time}`, time.toString())
    for (let i=0; i<30; i++){
      const key = `${localStoragekeyPrefix.location}_${time}_${i}`
      localStorage.setItem(key, JSON.stringify(data))
    }
  },[])

  useEffect(() => {
    onLiveRef.current = onLive;
  }, [onLive]);

  useEffect(() => {
    onArchiveRef.current = onArchive;
  }, [onArchive]);

  useEffect(() => {
    if (!openedDownloadModal){
      setLocalTimeLogs([])
      setSelectedIndex(null)
    }
  }, [openedDownloadModal]);

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
    const startTime = Date.now();
    let count = 0;
    saveTimestampLocally(startTime)
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
            // setMapData((prevData) => [...prevData, formatedData]); // リアルタイム更新
            const currentTime = Date.now() / 1000;
            const formatedLocalData: LocalLocationLog = {unixTime: currentTime, latitude: parsedData.latitude, longitude: parsedData.longitude, altitude: parsedData.altitude}
            saveLocationLocally(startTime, count, formatedLocalData)
            setCount((prev)=>{return ++prev})
            recordTime(`${formatedData.position[0]},${formatedData.position[1]},${formatedData.position[2]}`)
            ++count
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
      // setOpenedDownloadModal(true)
      const endTime = Date.now()
      updateTimestampLocally(startTime, endTime)
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
            const formatedData: MapData = {position:[parsedData.longitude, parsedData.latitude, parsedData.altitude+50 ], scale: 1}
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
      {
        name: 'Local',
        func: () => {
          setOpenedMenu(false)
          loadTimestampListLocally()
          setOpenedDownloadModal(true)
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
  // const generateCSV = () => {
  //   const header = "No,Time\n";
  //   const rows = records.map((time, index) => `${index + 1},${time}`).join("\n");
  //   const csvContent = header + rows;
  //   const fileName = `time_records_${generateTimestamp()}`

  //   downloadFile(csvContent, fileName, "text/csv");
  //   setOpenedDownloadModal(false)
  //   setRecords([])
  // };
  const generateCSV = (time: number): boolean => {
    const header = "No,Time,Latitude,Longitude,Altitude\n";
    const localLocations = loadLocationLocally(time)
    const rows = localLocations.map((ll, i) => `${i+1},${ll.unixTime},${ll.latitude},${ll.longitude},${ll.altitude}`).join("\n");
    const csvContent = header + rows;
    const fileName = `location_records_${generateTimestamp()}`

    downloadFile(csvContent, fileName, "text/csv");
    return true
  };

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

  const saveTimestampLocally = (time: number) => {
    const key = `${localStoragekeyPrefix.timestamp}_${time}`
    localStorage.setItem(key, "")
  }
  const updateTimestampLocally = (startTime: number, endTime: number) => {
    const key = `${localStoragekeyPrefix.timestamp}_${startTime}`
    localStorage.setItem(key, endTime.toString())
  }
  const loadTimestampListLocally = () => {
    const prefix = `${localStoragekeyPrefix.timestamp}_`
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const value = localStorage.getItem(key) || "不明";
        const data: LocalTimeLog = {start_time: Number(key.split(prefix)[1]), end_time: Number(value)}
        setLocalTimeLogs((prev) => [...prev, data])
      }
    }
  }
  const deleteTimestampLocally = (time: number): boolean => {
    const locationPrefix = `${localStoragekeyPrefix.location}_${time}`
    const timestamp = `${localStoragekeyPrefix.timestamp}_${time}`
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(locationPrefix)) return false
    }
    if (localStorage.getItem(timestamp) !== null) {
      localStorage.removeItem(timestamp);
    }
    return true
  }
  const saveLocationLocally = (time: number, id: number, data: LocalLocationLog) => {
    const key = `${localStoragekeyPrefix.location}_${time}_${id}`
    localStorage.setItem(key, JSON.stringify(data))
  }
  const loadLocationLocally = (time: number): LocalLocationLog[] => {
    const result: LocalLocationLog[] = [];
    const prefix = `${localStoragekeyPrefix.location}_${time}`
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keys.push(key);
      }
    }
    keys.sort(); // タイムスタンプ順にソートする
    for (const key of keys) {
      const value = localStorage.getItem(key) || "不明";
      const parsedData = JSON.parse(value);
      result.push(parsedData);
    }
    return result;
  }
  const deleteLocationLocally = (time: number) => {
    const prefix = `${localStoragekeyPrefix.location}_${time}`
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        console.log(key)
        localStorage.removeItem(key);
      }
    }
  }

  const formatJPTime = (isoDate: string|number): string => { // ex. 2024-12-16T12:30:00.000000Z
    const date = new Date(isoDate);
    const options: Intl.DateTimeFormatOptions = {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    };
    const jstDate = date.toLocaleString("ja-JP", options);
    return jstDate
  }

  const handleDownload = (time: number) => {
    const success = generateCSV(time); // CSV生成の結果を取得
    if (success) {
      setFlags((prevFlags) => ({
        ...prevFlags,
        [time]: true,
      }));
    }
  };

  const handleDelete = (time: number) => {
    setIsLoading(true)
    while (true) {
      deleteLocationLocally(time)
      const ok = deleteTimestampLocally(time)
      if (ok) break
    }
    setFlags((prevFlags) =>
      Object.fromEntries(
        Object.entries(prevFlags).filter(([key]) => key !== String(time))
      )
    )
    setLocalTimeLogs((prev) => prev.filter((item) => item.start_time !== time));
    setIsLoading(false)
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
            <ul className="bg-white p-5 rounded-md flex flex-col items-center overflow-y-auto max-h-96 w-4/5 space-y-2" onClick={(event) => event.stopPropagation()}>
              {
                archiveList.map((span,i)=>(
                  <li className="w-full leading-none" key={i}>
                    <div
                      onClick={()=>fetchArchiveStream(span)}
                      className={`bg-white text-gray-700 text-sm w-4/5 h-30 hover:bg-gray-300`}
                      >
                      {i+1}: データ数 <span className="text-red-500">{span.location_count}</span><br />
                      {formatJPTime(span.start_time)}<br />
                            ~         <br />
                      {formatJPTime(span.end_time)}
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
          <div className="absolute top-0 left-0 w-screen h-screen bg-black bg-opacity-70 z-50 flex justify-center items-center" onClick={()=>setOpenedDownloadModal(false)}>
            <ul className="bg-white p-5 rounded-md flex flex-col items-center overflow-y-auto max-h-96 w-4/5 space-y-2" onClick={(event) => event.stopPropagation()}>
              {
                localTimeLogs.length > 0 ? localTimeLogs.map((span,i)=>(
                  <li className="w-full leading-none" key={i}>
                    <div
                      onClick={()=>setSelectedIndex(i)}
                      className={`bg-white text-gray-700 text-xs w-full rounded-md h-30 hover:bg-gray-300`}
                      >
                      {i+1}<br />
                      {formatJPTime(span.start_time)}<br />
                            ~         <br />
                      {formatJPTime(span.end_time)}
                    </div>
                    {
                      i == selectedIndex && (
                        <div className="flex justify-end space-x-3 text-slate-900">
                          <button
                            onClick={()=>handleDownload(span.start_time)}
                            className={"bg-teal-500 text-sm p-2 rounded-md hover:bg-teal-700 disabled:bg-gray-400"}
                            disabled={isLoading}
                            >
                            ダウンロード(.csv)
                          </button>
                          { !isLoading
                           ? <button
                              onClick={()=>handleDelete(span.start_time)}
                              className={"bg-red-400 text-sm p-2 rounded-md hover:bg-red-700 disabled:bg-gray-400"}
                              disabled={!flags[span.start_time]}
                              >
                              削除
                            </button>
                            : <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          }
                        </div>
                      )
                    }
                    <hr className="w-full border-[1px] border-teal-700" />
                  </li>
                )): <div className="text-black">データが存在しません</div>
              }
            </ul>
          </div>
        )
      }
      <DeckGL
        initialViewState={initialViewState}
        controller={{
          dragRotate: true,
          touchRotate: true,
          doubleClickZoom: false,
          keyboard: true,
        }}
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
