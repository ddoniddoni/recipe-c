import "server-only";
import { getServerEnv } from "@/lib/env/server";
import type { SampleRecipe } from "./types";

// Presentation fixtures only. No accounts, ratings, awards, or persisted records.
const recipes: readonly SampleRecipe[] = [
  {
    id: "sample-tomato-rice",
    title: "토마토 달걀 덮밥",
    category: "밥/덮밥",
    summary:
      "잘 익은 토마토와 부드러운 달걀. 팬 하나로 가볍게 차리는 한 그릇을 소개해요.",
    author: "샘플 작성자 · 한끼",
    minutes: 15,
    servings: 1,
    difficulty: "쉬움",
    tone: "clay",
    ingredients: [
      { name: "토마토", amount: "1개" },
      { name: "달걀", amount: "2개" },
      { name: "밥", amount: "1공기" },
      { name: "대파", amount: "1/4대" },
      { name: "식용유", amount: "1큰술" },
      { name: "소금", amount: "약간" },
    ],
    steps: [
      "토마토는 한입 크기로 자르고 대파는 송송 썰어요. 달걀은 그릇에 풀어 준비해요.",
      "팬에 식용유를 두르고 달걀을 저어 가며 익힌 뒤 잠시 덜어 두어요.",
      "같은 팬에 대파와 토마토를 넣고 볶아요. 토마토가 부드러워지면 달걀을 다시 넣고 충분히 익혀요.",
      "소금으로 간을 맞추고 따뜻한 밥 위에 담아요.",
    ],
    tip: "토마토에서 나온 즙을 졸이는 정도로 촉촉함을 조절해 보세요.",
  },
  {
    id: "sample-mushroom-noodles",
    title: "버섯 들기름 비빔국수",
    category: "면",
    summary:
      "노릇하게 볶은 버섯에 들기름 향을 더했어요. 복잡한 양념 없이 즐기는 소박한 한 끼예요.",
    author: "샘플 작성자 · 소담",
    minutes: 20,
    servings: 1,
    difficulty: "쉬움",
    tone: "oat",
    ingredients: [
      { name: "소면", amount: "100g" },
      { name: "느타리버섯", amount: "80g" },
      { name: "들기름", amount: "1큰술" },
      { name: "간장", amount: "1큰술" },
      { name: "김가루", amount: "취향껏" },
    ],
    steps: [
      "느타리버섯을 먹기 좋게 찢어 팬에서 충분히 익혀요.",
      "소면을 포장에 적힌 시간에 맞춰 삶고 찬물에 헹군 뒤 물기를 빼요.",
      "면에 간장과 들기름을 넣어 고루 비벼요. 버섯과 김가루를 올려 마무리해요.",
    ],
    tip: "면의 물기를 충분히 빼면 양념이 묽어지지 않아요.",
  },
  {
    id: "sample-tofu-salad",
    title: "구운 두부와 초록 샐러드",
    category: "샐러드",
    summary:
      "겉은 노릇하고 속은 부드러운 두부를 싱싱한 잎채소와 함께 담아 보세요.",
    author: "샘플 작성자 · 초록",
    minutes: 20,
    servings: 1,
    difficulty: "쉬움",
    tone: "herb",
    ingredients: [
      { name: "두부", amount: "150g" },
      { name: "잎채소", amount: "한 줌" },
      { name: "올리브유", amount: "1큰술" },
      { name: "레몬즙", amount: "1작은술" },
      { name: "소금", amount: "약간" },
    ],
    steps: [
      "두부의 물기를 닦고 한입 크기로 썰어요. 잎채소는 씻어 물기를 빼요.",
      "기름을 두른 팬에 두부를 넣고 양면이 노릇해질 때까지 익혀요.",
      "그릇에 잎채소와 두부를 담고 레몬즙과 소금으로 가볍게 맛을 더해요.",
    ],
    tip: "잎채소는 먹기 직전에 양념하면 식감을 유지하기 좋아요.",
  },
];

export function getSampleRecipes(): readonly SampleRecipe[] {
  if (!getServerEnv().demoMode) return [];
  return recipes;
}
