import { Modal } from "antd";
import StepsDag from "../../common/StepsDag";
import { useCallback, useEffect, useState } from "react";
import { toolDisplayNames } from "../../../../../utils/utils";

export default function BadModal({ open, setModalVisible, analysisSteps }) {
    const [dag, setDag] = useState(null);
    const [dagLinks, setDagLinks] = useState([]);

    const [activeNode, _setActiveNode] = useState(null);

    // which feedback section is the user currently on
    const [activeSection, setActiveSection] = useState("general");

    // extend setActiveNode to prevent changing node when we click an "output" node
    // only change the node when we click a tool node
    const setActiveNode = useCallback((node) => {
        if (node.data.isTool) {
            _setActiveNode(node);
        }
    })



    const [comments, setComments] = useState({});

    useEffect(() => {
        // create a comments object with the step id as the key
        const newComments = {
            ...comments
        }
        analysisSteps.forEach((step) => {
            // if this exists, don't do anything
            if (newComments[step.tool_run_id]) {
                return;
            }

            newComments[step.tool_run_id] = {
                description: {
                    "heading": "Step description",
                    value: step.description,
                    comments: "",
                    placeholder: "Leave your feedback about this step's description here..."
                },
                tool: {
                    "heading": "Tool",
                    value: toolDisplayNames[step.tool_name] || "Unknown tool",
                    comments: "",
                    placeholder: "Leave your feedback about the tool used in this step here..."
                },
                overall: {
                    "heading": "Overall step feedback",
                    comments: "",
                    placeholder: "Leave your overall feedback about this step here...",
                    isOverall: true
                },
            }
        });

        setComments(newComments);
    }, [analysisSteps])


    return <Modal
        title={<p className="text-2xl text-gray-900">What went wrong?</p>}
        open={open}
        footer={null}
        onCancel={(ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            setModalVisible(false)
        }}
        centered
        className={"w-10/12 h-10/12"}
    >
        <div className="flex flex-row">
            <div className={`general-feedback py-5 pr-5`}>
                <p className="text-lg  text-gray-900 font-bold">General feedback</p>
                <p className="text-sm  text-gray-400">You can leave general comments about the overall plan here</p>
                <div className={`p-5 border rounded-md mr-4`}>
                    <textarea
                        className="w-full min-h-10 p-2 border border-gray-300 rounded-md"
                        placeholder="Leave your feedback here..."
                    />
                </div>
            </div>
            <div className={`step-wise-feedback py-5 pl-5 flex-grow `}

            >
                <p className="text-lg  text-gray-900 font-bold">Step wise feedback</p>
                <p className="text-sm  text-gray-400">You can leave detailed comments for specific steps here</p>
                <div className={`p-5 flex-grow border transition-all rounded-md`}
                    onMouseOver={() => setActiveSection("step")}
                    onMouseOut={() => { setActiveSection("general") }}>
                    <div className="flex flex-row my-4">
                        <div className="relative">
                            <StepsDag
                                steps={analysisSteps}
                                nodeRadius={5}
                                dag={dag}
                                setDag={setDag}
                                setDagLinks={setDagLinks}
                                dagLinks={dagLinks}
                                skipAddStepNode={true}
                                setActiveNode={setActiveNode}
                                activeNode={activeNode}
                                setLastOutputNodeAsActive={false}
                                alwaysShowPopover={activeSection === "step"}
                            />
                        </div>
                        <div className="user-comments-ctr flex flex-col pl-8 relative flex-grow">

                            {activeNode ?
                                (activeNode.data.isTool ? <div>
                                    {
                                        Object.keys(comments[activeNode.data.step.tool_run_id]).map((key) => {
                                            const comment = comments[activeNode.data.step.tool_run_id][key];
                                            console.log(comment)

                                            return <div key={key} className="mb-4">
                                                <p className="text-sm font-bold text-gray-900 ">{comment.heading}</p>
                                                <p className="text-sm text-gray-900">{comment.value || comment.isOverall ||
                                                    <span className="text-gray-400">No value for "{comment.heading}". This might be a user created step.</span>
                                                }</p>
                                                <textarea
                                                    className="w-full min-h-10 p-2 border border-gray-300 rounded-md"
                                                    value={comment.comments}
                                                    placeholder={comment.placeholder || `Leave your feedback about "${comment.heading}" here...`}
                                                    onChange={(ev) => {
                                                        const newComments = {
                                                            ...comments
                                                        }
                                                        newComments[activeNode.data.step.tool_run_id][key].comments = ev.target.value;
                                                        setComments(newComments);
                                                    }}
                                                />
                                            </div>
                                        })
                                    }
                                </div> : <div>

                                </div>) : <div className="text-gray-400">Click on a node to leave a comment</div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </Modal>
}