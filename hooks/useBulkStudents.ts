import { bulkAddStudents } from "@/lib/actions";
import { useMutation } from "@tanstack/react-query";

const useBulkAddStudents = () => {
  return useMutation({
    mutationFn: async (students: Array<{
      username: string;
      firstName: string;
      lastName: string;
      school: string;
      password: string;
      imageUrl?: string;
    }>) => {
      return await bulkAddStudents(students);
    },
    onSuccess: () => {
      // Refetch students list or update cache
      // queryClient.invalidateQueries(['students']);
    },
  });
};

export default useBulkAddStudents;