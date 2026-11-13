import React from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDate, cleanStoryText } from "@/utils/story/formattingUtils";
import TrianglePicker from "@/components/collect/form-fields/TrianglePicker";
import { Story } from "@/types/story";

interface StoryDetailsProps {
    story: Story;
}

const StoryDetails: React.FC<StoryDetailsProps> = ({
    story,
}) => {
    const hasSliderResponses = story.sliderResponses && story.sliderResponses.length > 0;
    const hasParticipantResponses = story.participantResponses && story.participantResponses.length > 0;
    const hasTriangleResponses = story.triangleResponses && story.triangleResponses.length > 0;
    const hasAdditionalComments = story.additional_comments && story.additional_comments.trim() !== '';

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground [text-wrap:balance]">
                        {story.title}
                    </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="tabular-nums">{formatDate(story.date)}</span>
                    <span>•</span>
                    <span>Feeling: <span className="font-medium text-foreground">{story.feeling}</span></span>
                </div>
            </div>

            <div className="font-serif text-base md:text-lg text-foreground/95 leading-relaxed [text-wrap:pretty] whitespace-pre-line bg-muted/20 p-5 md:p-6 rounded-xl border border-border/60">
                {cleanStoryText(story.text, story.title, story.additional_comments)}
            </div>

            {hasAdditionalComments && (
                <div className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Additional Comments</span>
                    <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line p-4 rounded-xl bg-muted/30 border border-border/60">
                        {story.additional_comments}
                    </div>
                </div>
            )}

            {hasSliderResponses && (
                <>
                    <Separator className="my-6" />
                    <div>
                        <h3 className="text-base font-semibold mb-3 text-foreground">Slider Responses</h3>
                        <div className="space-y-3">
                            {story.sliderResponses?.map((response) => (
                                <div key={response.id} className="bg-card p-4 rounded-xl border border-border/80 shadow-xs space-y-2.5">
                                    <h4 className="font-medium text-sm text-foreground">{response.question_text}</h4>
                                    <div className="flex items-center space-x-3">
                                        {response.value !== null ? (
                                            <>
                                                <div className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                                                    {response.left_label || "Low"}
                                                </div>
                                                <div className="relative flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-300"
                                                        style={{ width: `${response.value}%` }}
                                                    ></div>
                                                </div>
                                                <div className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                                                    {response.right_label || "High"}
                                                </div>
                                                <div className="ml-2 font-semibold tabular-nums text-xs text-foreground">{response.value}%</div>
                                            </>
                                        ) : (
                                            <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted/50 border border-border/60">Skipped</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {hasParticipantResponses && (
                <>
                    <Separator className="my-6" />
                    <div>
                        <h3 className="text-base font-semibold mb-3 text-foreground">Participant Responses</h3>
                        <div className="space-y-3">
                            {story.participantResponses?.map((response) => (
                                <div key={response.id} className="bg-card p-4 rounded-xl border border-border/80 shadow-xs space-y-1.5">
                                    <h4 className="font-medium text-sm text-foreground">{response.question_text}</h4>
                                    <div className="text-sm text-foreground/80">
                                        {(() => {
                                            const resp = response.response;
                                            if (resp === null || resp === undefined || resp === "") {
                                                return <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted/50 border border-border/60">Skipped</span>;
                                            }
                                            if (Array.isArray(resp)) {
                                                return resp.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                                        {resp.map((item, idx) => (
                                                            <Badge key={idx} variant="secondary" className="font-normal text-xs bg-muted/80 text-foreground border-border/60">
                                                                {String(item)}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted/50 border border-border/60">Skipped</span>
                                                );
                                            }
                                            if (typeof resp === "boolean") {
                                                return resp ? "Yes" : "No";
                                            }
                                            return String(resp);
                                        })()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {hasTriangleResponses && (
                <>
                    <Separator className="my-6" />
                    <div>
                        <h3 className="text-base font-semibold mb-3 text-foreground">Triangle Responses</h3>
                        <div className="space-y-3">
                            {story.triangleResponses?.map((response) => (
                                <div key={response.id} className="bg-card p-4 rounded-xl border border-border/80 shadow-xs">
                                    <h4 className="font-medium text-sm text-foreground mb-3">{response.question_text}</h4>
                                    {response.response_type === "skipped" || response.x_position === null || response.y_position === null ? (
                                        <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted/50 border border-border/60">Skipped</span>
                                    ) : (
                                        <div className="flex justify-center py-2">
                                            <div className="w-full max-w-[300px]">
                                                <TrianglePicker
                                                    topLabel={response.top_label || "Top"}
                                                    bottomLeftLabel={response.bottom_left_label || "Left"}
                                                    bottomRightLabel={response.bottom_right_label || "Right"}
                                                    position={{
                                                        x: response.x_position ?? 50,
                                                        y: response.y_position ?? 50
                                                    }}
                                                    onChange={() => { }}
                                                    disabled={true}
                                                    hideHelperText={true}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default StoryDetails;
