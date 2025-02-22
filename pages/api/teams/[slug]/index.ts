import { sendAudit } from '@/lib/retraced';
import { getSession } from '@/lib/session';
import {
  deleteTeam,
  getTeam,
  isTeamMember,
  isTeamOwner,
  updateTeam,
} from 'models/team';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  switch (method) {
    case 'GET':
      return handleGET(req, res);
    case 'PUT':
      return handlePUT(req, res);
    case 'DELETE':
      return handleDELETE(req, res);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      res.status(405).json({
        data: null,
        error: { message: `Method ${method} Not Allowed` },
      });
  }
}

// Get a team by slug
const handleGET = async (req: NextApiRequest, res: NextApiResponse) => {
  const { slug } = req.query;

  const session = await getSession(req, res);
  const userId = session?.user?.id as string;

  const team = await getTeam({ slug: slug as string });

  if (!(await isTeamMember(userId, team.id))) {
    return res.status(400).json({
      data: null,
      error: { message: 'Bad request.' },
    });
  }

  return res.status(200).json({ data: team, error: null });
};

// Update a team
const handlePUT = async (req: NextApiRequest, res: NextApiResponse) => {
  const { slug } = req.query;

  const session = await getSession(req, res);

  if (!session) {
    return res.status(401).json({
      error: { message: 'Unauthorized.' },
    });
  }

  const team = await getTeam({ slug: slug as string });

  if (!(await isTeamOwner(session.user.id, team.id))) {
    return res.status(400).json({
      data: null,
      error: { message: `You don't have permission to do this action.` },
    });
  }

  const updatedTeam = await updateTeam(slug as string, {
    name: req.body.name,
    slug: req.body.slug,
    domain: req.body.domain,
  });

  sendAudit({
    action: 'team.update',
    crud: 'u',
    user: session.user,
    team,
  });

  return res.status(200).json({ data: updatedTeam, error: null });
};

// Delete a team
const handleDELETE = async (req: NextApiRequest, res: NextApiResponse) => {
  const slug = req.query.slug as string;

  const session = await getSession(req, res);

  if (!session) {
    return res.status(401).json({
      error: { message: 'Unauthorized.' },
    });
  }

  const team = await getTeam({ slug });

  if (!(await isTeamOwner(session.user.id, team.id))) {
    return res.status(200).json({
      data: null,
      error: { message: `You don't have permission to do this action.` },
    });
  }

  await deleteTeam({ slug });

  sendAudit({
    action: 'team.delete',
    crud: 'd',
    user: session.user,
    team,
  });

  return res.status(200).json({ data: {}, error: null });
};
