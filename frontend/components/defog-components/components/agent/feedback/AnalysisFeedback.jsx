
import ThumbsUp from "../../svg/ThumbsUp";
import ThumbsDown from "../../svg/ThumbsDown";
import { useState } from "react";
import GoodModal from "./GoodModal";
import BadModal from "./BadModal";
import { Popover } from "antd";


export function AnalysisFeedback({ analysisSteps }) {
    const [modalVisible, setModalVisible] = useState(null);

    return (
        <div className="analysis-feedback flex flex-row content-center">
            <p className="text-sm mr-4 text-gray-400">Was this your desired result?</p>

            <Popover content="Yep!">
                <div className="good-feedback mr-4 h-4 w-4 cursor-pointer" onClick={() => setModalVisible("good")}>
                    <ThumbsUp fill="fill-gray-300 hover:fill-dark-green" />
                </div>
            </Popover>
            <Popover content="Nope">
                <div className="bad-feedback h-4 w-4 pt-1 cursor-pointer"
                    onClick={() => setModalVisible("bad")}
                >
                    <ThumbsDown fill="fill-gray-300 hover:fill-dark-red" />
                </div>
            </Popover>

            <GoodModal open={modalVisible === "good"} setModalVisible={setModalVisible} analysisSteps={analysisSteps} />
            <BadModal open={modalVisible === "bad"} setModalVisible={setModalVisible} analysisSteps={analysisSteps} />
        </div>
    );
}