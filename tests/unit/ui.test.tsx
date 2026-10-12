import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TextField } from "@/components/ui/text-field";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { SetupNotice } from "@/components/layout/setup-notice";

describe("accessible UI foundations", () => {
  it("associates labels, help and error text while retaining typed input", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <TextField id="title" label="제목" hint="5자 이상" />,
    );
    const input = screen.getByRole("textbox", { name: "제목" });
    await user.type(input, "토마토");
    rerender(
      <TextField id="title" label="제목" hint="5자 이상" error="너무 짧아요" />,
    );
    expect(input).toHaveValue("토마토");
    expect(input).toHaveAccessibleDescription("5자 이상 너무 짧아요");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("너무 짧아요");
  });
  it("defaults ordinary buttons to non-submitting and retries by keyboard", async () => {
    const retry = vi.fn();
    const user = userEvent.setup();
    render(<ErrorState onRetry={retry} />);
    const button = screen.getByRole("button", { name: "다시 시도" });
    expect(button).toHaveAttribute("type", "button");
    await user.tab();
    await user.keyboard("{Enter}");
    expect(retry).toHaveBeenCalledOnce();
  });
  it("does not invoke disabled buttons", async () => {
    const click = vi.fn();
    const user = userEvent.setup();
    render(
      <Button disabled onClick={click}>
        사용 불가
      </Button>,
    );
    await user.click(screen.getByRole("button"));
    expect(click).not.toHaveBeenCalled();
  });
  it("announces loading without exposing skeletons", () => {
    render(<LoadingState />);
    expect(screen.getByRole("status")).toHaveTextContent("불러오는 중");
  });
  it.each([false, true])(
    "never claims successful data access for config=%s",
    (hasSupabaseConfig) => {
      render(<SetupNotice hasSupabaseConfig={hasSupabaseConfig} />);
      expect(
        screen.getByText("지금은 로그인, 작성, 저장을 이용할 수 없어요."),
      ).toBeVisible();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    },
  );
});
