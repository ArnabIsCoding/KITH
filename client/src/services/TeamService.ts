import { ref, push, get, remove } from "firebase/database";
import { database } from "../firebase";
import { TeamMemberModel } from "../models/TeamMemberModel";

export const addTeamMember = async (userId: string, member: TeamMemberModel) => {
  const teamRef = ref(database, `users/${userId}/teamMembers`);
  await push(teamRef, member);
};

export const fetchTeamMembers = async (userId: string): Promise<TeamMemberModel[]> => {
  const teamRef = ref(database, `users/${userId}/teamMembers`);
  const snapshot = await get(teamRef);
  if (snapshot.exists()) {
    const data = snapshot.val();
    return Object.keys(data).map(key => ({
      id: key,
      ...data[key]
    }));
  }
  return [];
};

export const removeTeamMember = async (userId: string, memberId: string) => {
  const memberRef = ref(database, `users/${userId}/teamMembers/${memberId}`);
  await remove(memberRef);
};
