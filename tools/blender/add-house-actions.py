"""Add the house-journey actions to the rigged low-poly human.

Usage (from the repository root):
    blender -b --factory-startup --python tools/blender/add-house-actions.py

Optional arguments after "--":
    --input <glb>        source GLB (default: the untouched backup)
    --output <glb>       exported GLB (default: public/assets/models/human-lowpoly-rigged.glb)
    --props-json <path>  also write the glass transforms for checks

The script imports the untouched backup, keeps the six original actions as they
are, builds four in-place actions with procedural keys and exports every action
as its own glTF animation. Limbs are posed with an analytic two-bone IK and the
result is written straight to FK keys, so no helper objects or constraints are
ever created.

Axes: constants are written in glTF / three.js space (+Y up, the character faces
+Z, +X is the character's left) and converted with g2b() to Blender space
(+Z up, the character faces -Y). No extra axis rotation is added anywhere.
"""

import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Quaternion, Vector

# ---------------------------------------------------------------------------
# Paths and arguments
# ---------------------------------------------------------------------------

REPO = Path(__file__).resolve().parents[2]
DEFAULT_INPUT = REPO / "tools/blender/source/backup/human-lowpoly-rigged-original.glb"
DEFAULT_OUTPUT = REPO / "public/assets/models/human-lowpoly-rigged.glb"
# The figure to open in Blender. Its Body mesh (eyebrows and beard painted, any faces cut with the knife)
# is read back on every run, so edits saved in this file reach the GLB. Everything else is rebuilt.
DEFAULT_BLEND = REPO / "tools/blender/source/human-lowpoly-rigged.blend"


def read_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    args = {"input": str(DEFAULT_INPUT), "output": str(DEFAULT_OUTPUT), "blend": str(DEFAULT_BLEND), "props-json": None}
    for i in range(0, len(argv) - 1, 2):
        key = argv[i].lstrip("-")
        if key not in args:
            raise SystemExit("Unknown argument: " + argv[i])
        args[key] = argv[i + 1]
    return args


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

FPS = 24
ORIGINAL_ACTIONS = ("Idle", "SitDown", "SitIdle", "StandUp", "Typing", "Walk")


def g2b(x, y, z):
    """glTF (x, y up, z forward) -> Blender (x, -z, y)."""
    return Vector((x, -z, y))


# Blender-space directions relative to the character.
LEFT = Vector((1.0, 0.0, 0.0))
FORWARD = Vector((0.0, -1.0, 0.0))
UP = Vector((0.0, 0.0, 1.0))
# Rotation sign conventions (degrees, right-hand rule):
#   rot(LEFT, +a)    pitches forward (lean / nod down / toes down)
#   rot(UP, +a)      turns towards the character's left
#   rot(FORWARD, +a) rolls the top towards the character's right

# Hand measurements from the mesh (hand bone local: f = along the bone,
# p = towards the palm). The palm skin sits 0.034 m from the bone axis.
PALM_SKIN = 0.034
PALM_CENTRE = 0.060          # palm centre along the hand bone

# Foot measurements in the rest pose (sole on z = 0).
SOLE_TO_BALL = 0.021         # ToeBase head above the sole
FOOT_CENTRE_TO_BALL = 0.042  # ball joint ahead of the foot centre (heel -0.079, toe +0.153 from root)

# Centre of the lower lip in the rest pose (Blender space), used by Drink.
LOWER_LIP_REST = Vector((0.0, -0.100, 1.548))

# --- StairsDown ----------------------------------------------------------
STAIRS_FRAMES = 32           # two treads per cycle: c = 2 * t
STAIR_RUN = 0.32             # tread depth (forward advance per tread)
STAIR_RISE = 0.20            # riser (descent per tread)
STAIR_TOP_OFFSET = -0.02     # tread n top: y = -RISE * (n - c) + offset
STEP_LAND = -0.30            # foot reaches tread n at c = n - 0.30
STEP_LIFT = 0.80             # and leaves it at c = n + 0.80
FOOT_ON_TREAD = 0.01         # foot centre ahead of the tread centre
HEEL_DOWN = -0.15            # heel flat on the tread from c = n - 0.15 ...
HEEL_UP = 0.50               # ... until c = n + 0.50
LAND_PITCH = 12.0            # toes-first landing angle
LIFT_PITCH = 34.0            # heel raised at toe-off
SWING_MID_PITCH = -8.0       # toes up mid-swing
SWING_LIFT = 0.055           # extra swing height over the straight path
STAIR_HIP_HEIGHT = 0.805     # pelvis above the root (mean)
STAIR_HIP_BOB = 0.018
STAIR_HIP_FORWARD = -0.030
STAIR_HIP_SWAY = 0.022
STAIR_FOOT_WIDTH = 0.120     # ankle distance from the centre line

# --- Wave ----------------------------------------------------------------
WAVE_FRAMES = 48
WAVE_COUNT = 3               # waves per loop
WAVE_SWING = 22.0            # forearm swing either side (degrees)

# --- LeanRail ------------------------------------------------------------
RAIL_FRAMES = 96
RAIL_TOP = 0.99              # rail top above the root
RAIL_FORWARD = 0.36          # rail centre line in front of the root
RAIL_HAND_SPACING = 0.25     # hands either side of the centre
RAIL_LEAN = 15.0             # torso lean (degrees)

# --- Drink ---------------------------------------------------------------
DRINK_FRAMES = 120
DRINK_GRAB = 24              # frame (0.20): the hand is closed on the resting glass over frames 21-27
DRINK_RELEASE = 105.6        # frame (0.88): the hand rests on the put-back glass over frames 102.6-108.6
DRINK_REACH_PALM = 0.45      # palm turned towards the counter while reaching
DRINK_HIP_BEND = 14.0        # a slight bend at the hips while reaching the glass at arm's length (degrees)
COUNTER_ELBOW_POLE = Vector((-0.35, -0.45, -1.0))  # elbow direction at the counter: down, forward, a little out
GLASS_REST = g2b(-0.19, 0.99, 0.41)  # glass centre on the counter (bottom on the top at y = 0.935), 0.08 m in from the edge
SIP_TILT_FIRST = 28.0        # glass tilt at the first sip (degrees)
SIP_TILT_MAX = 36.0
SIP_PALM_TURN = 100.0        # palm turned from "facing left" towards the face
SIP_ROLL = 25.0              # glass top rolled towards the character's right while sipping
SIP_ELBOW_RISE = g2b(-0.22, 1.10, 0.18)   # elbow aim while lifting to / lowering from the lip
SIP_ELBOW_LOW = g2b(-0.16, 1.36, 0.26)    # at the first sip: low and forward (root-local)
SIP_ELBOW_HIGH = g2b(-0.165, 1.38, 0.26)  # and at the steepest tilt
COUNTER_TOP = 0.935
COUNTER_EDGE = 0.33

# --- Glass in hand -------------------------------------------------------
GLASS_RADIUS = 0.035
GLASS_GRIP_TILT = 20.0       # tumbler lies obliquely across the palm, its top leaning towards the fingers
GLASS_GRIP_HEIGHT = 0.045    # glass centre above the hand's grip line: the hand holds the glass near its base
GLASS_HEIGHT = 0.11


# ---------------------------------------------------------------------------
# Math helpers
# ---------------------------------------------------------------------------

def rot(axis, degrees):
    return Matrix.Rotation(math.radians(degrees), 3, axis)


def smooth(t):
    t = min(1.0, max(0.0, t))
    return t * t * (3.0 - 2.0 * t)


def lerp(a, b, t):
    return a + (b - a) * t


def wave(frame, frames, cycles=1.0, phase=0.0):
    """Seamless sine for loops: frame 0 and frame `frames` give the same value."""
    return math.sin(2.0 * math.pi * (cycles * frame / frames + phase))


def frame_from(primary, secondary):
    """Orthonormal 3x3 whose columns are primary, secondary (made perpendicular), cross."""
    a = primary.normalized()
    b = (secondary - a * secondary.dot(a)).normalized()
    return Matrix((a, b, a.cross(b))).transposed()


def align(rest_a, rest_b, new_a, new_b):
    """Rotation taking rest_a to new_a and rest_b (as far as possible) to new_b."""
    return frame_from(new_a, new_b) @ frame_from(rest_a, rest_b).transposed()


def keyframes(points, t):
    """Smooth piecewise interpolation of [(time, value), ...] (value: float or Vector)."""
    if t <= points[0][0]:
        return points[0][1].copy() if isinstance(points[0][1], Vector) else points[0][1]
    for (t0, v0), (t1, v1) in zip(points, points[1:]):
        if t <= t1:
            return lerp(v0, v1, smooth((t - t0) / (t1 - t0)))
    return points[-1][1].copy() if isinstance(points[-1][1], Vector) else points[-1][1]


# ---------------------------------------------------------------------------
# Rig and pose (pure Python forward kinematics on top of the rest pose)
# ---------------------------------------------------------------------------

class Rig:
    def __init__(self, armature):
        self.armature = armature
        bones = armature.data.bones
        self.names = [b.name for b in bones]
        self.parent = {b.name: (b.parent.name if b.parent else None) for b in bones}
        self.rest = {b.name: b.matrix_local.copy() for b in bones}
        self.rest_orient = {n: m.to_3x3().normalized() for n, m in self.rest.items()}
        self.local_rest = {}
        for name, matrix in self.rest.items():
            parent = self.parent[name]
            self.local_rest[name] = self.rest[parent].inverted() @ matrix if parent else matrix.copy()
        self.hinge = {}
        # Rest palm normal: the T-pose palms face down.
        self.palm_local = {}
        for side in ("Left", "Right"):
            hand = side + "Hand"
            self.palm_local[hand] = self.rest_orient[hand].transposed() @ Vector((0, 0, -1))
            # Elbows point back and knees point forward in the rest pose.
            self.add_chain(side + "Arm", side + "ForeArm", hand, Vector((0, 1, 0)))
            self.add_chain(side + "UpLeg", side + "Leg", side + "Foot", Vector((0, -1, 0)))
        self.finger_axis = {}
        for side in ("Left", "Right"):
            palm = Vector((0, 0, -1))
            for finger in ("Index1", "Middle1", "Ring1", "Pinky1", "Thumb1"):
                name = side + "Hand" + finger
                direction = self.rest_orient[name].col[1]
                # Curling rotates the finger towards the palm normal.
                axis = direction.cross(palm).normalized()
                self.finger_axis[name] = self.rest_orient[name].transposed() @ axis

    def head(self, name):
        return self.rest[name].translation.copy()

    def add_chain(self, upper, lower, end, rest_pole):
        start, middle, stop = self.head(upper), self.head(lower), self.head(end)
        direction = (stop - start).normalized()
        pole = (rest_pole - direction * rest_pole.dot(direction)).normalized()
        normal = direction.cross(pole)
        self.hinge[upper] = normal
        self.hinge[lower] = normal
        self.hinge[upper + ":lengths"] = ((middle - start).length, (stop - middle).length)


class Pose:
    def __init__(self, rig, basis=None):
        self.rig = rig
        basis = basis or {}
        self.basis = {n: basis.get(n, Matrix.Identity(4)).copy() for n in rig.names}
        self.cache = {}

    def copy(self):
        return Pose(self.rig, self.basis)

    def parent_space(self, name):
        parent = self.rig.parent[name]
        base = self.matrix(parent) if parent else Matrix.Identity(4)
        return base @ self.rig.local_rest[name]

    def matrix(self, name):
        if name not in self.cache:
            self.cache[name] = self.parent_space(name) @ self.basis[name]
        return self.cache[name]

    def set_matrix(self, name, matrix):
        self.basis[name] = self.parent_space(name).inverted() @ matrix
        self.cache.clear()

    def head(self, name):
        return self.matrix(name).translation.copy()

    def orient(self, name):
        return self.matrix(name).to_3x3().normalized()

    def place(self, name, head, orient):
        self.set_matrix(name, Matrix.Translation(head) @ orient.to_4x4())

    def rotate(self, name, rotation):
        """Rotate a bone (and its children) about its head by an armature-space rotation."""
        self.place(name, self.head(name), rotation @ self.orient(name))

    def point(self, name, local):
        """Armature-space position of a point given in the bone's local space."""
        return self.matrix(name) @ local


def sample_action(rig, action, frame):
    """Basis matrices of an existing action at a (fractional) frame."""
    values = {}
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                for curve in bag.fcurves:
                    bone = curve.data_path.split('"')[1]
                    prop = curve.data_path.rsplit(".", 1)[1]
                    values.setdefault(bone, {}).setdefault(prop, {})[curve.array_index] = curve.evaluate(frame)
    basis = {}
    for bone, props in values.items():
        loc = props.get("location", {})
        quat = props.get("rotation_quaternion", {})
        scale = props.get("scale", {})
        location = Vector([loc.get(i, 0.0) for i in range(3)])
        rotation = Quaternion([quat.get(0, 1.0), quat.get(1, 0.0), quat.get(2, 0.0), quat.get(3, 0.0)]).normalized()
        size = Vector([scale.get(i, 1.0) for i in range(3)])
        basis[bone] = Matrix.LocRotScale(location, rotation, size)
    return Pose(rig, basis)


# ---------------------------------------------------------------------------
# Pose helpers
# ---------------------------------------------------------------------------

def solve_limb(pose, upper, lower, target, pole, report=None):
    """Analytic two-bone IK. `pole` is the direction the elbow / knee should point."""
    rig = pose.rig
    l1, l2 = rig.hinge[upper + ":lengths"]
    start = pose.head(upper)
    to_target = target - start
    reach = to_target.length
    clamped = min(max(reach, abs(l1 - l2) + 1e-4), (l1 + l2) * 0.9995)
    if report is not None:
        report.append(reach / (l1 + l2))
    u = to_target.normalized()
    v = (pole - u * pole.dot(u)).normalized()
    cos_a = (l1 * l1 + clamped * clamped - l2 * l2) / (2 * l1 * clamped)
    joint = start + (u * cos_a + v * math.sqrt(max(0.0, 1 - cos_a * cos_a))) * l1
    normal = u.cross(v)
    end = start + u * clamped
    for bone, a, b in ((upper, start, joint), (lower, joint, end)):
        rest = rig.rest_orient[bone]
        turn = align(rest.col[1], rig.hinge[bone], b - a, normal)
        pose.place(bone, pose.head(bone), turn @ rest)


def hand_orient(rig, hand, fingers, palm):
    """Hand orientation from the finger direction and the palm normal."""
    rest = rig.rest_orient[hand]
    turn = align(rest.col[1], rest @ rig.palm_local[hand], fingers, palm)
    return turn @ rest


def wrist_for(rig, hand, orient, palm_point):
    """Wrist (hand head) position that puts the palm centre skin on palm_point."""
    f = orient.col[1]
    p = orient @ rig.palm_local[hand]
    return palm_point - f * PALM_CENTRE - p * PALM_SKIN


def place_hand(pose, side, orient, wrist, pole, twist_share=0.5, report=None):
    """IK the arm to the wrist, orient the hand and spread the wrist twist."""
    arm, fore, hand = side + "Arm", side + "ForeArm", side + "Hand"
    solve_limb(pose, arm, fore, wrist, pole, report)
    pose.place(hand, pose.head(hand), orient)
    # Move part of the hand roll into the forearm to avoid a candy-wrapper wrist.
    q = pose.basis[hand].to_quaternion()
    twist = 2.0 * math.atan2(q.y, q.w)
    if twist > math.pi:
        twist -= 2 * math.pi
    pose.rotate(fore, Matrix.Rotation(twist * twist_share, 3, pose.orient(fore).col[1]))
    pose.place(hand, pose.head(hand), orient)


def curl(pose, side, index, middle, ring, pinky, thumb=0.0, thumb_swing=0.0, spread=0.0):
    """Finger curl in degrees (one bone per finger). Thumb also swings across the palm."""
    rig = pose.rig
    for finger, angle, fan in (("Index1", index, spread), ("Middle1", middle, 0.0),
                               ("Ring1", ring, -0.5 * spread), ("Pinky1", pinky, -spread)):
        name = side + "Hand" + finger
        rotation = Quaternion(rig.finger_axis[name], math.radians(angle))
        if fan:
            normal = rig.rest_orient[name].transposed() @ Vector((0, 0, 1))
            sign = 1 if side == "Left" else -1
            rotation = Quaternion(normal, math.radians(fan * sign)) @ rotation
        pose.basis[name] = rotation.to_matrix().to_4x4()
    name = side + "HandThumb1"
    rotation = Quaternion(rig.finger_axis[name], math.radians(thumb))
    palm_local = rig.rest_orient[name].transposed() @ Vector((0, 0, -1))
    sign = 1 if side == "Left" else -1
    rotation = Quaternion(palm_local, math.radians(thumb_swing * sign)) @ rotation
    pose.basis[name] = rotation.to_matrix().to_4x4()
    pose.cache.clear()


def plant_leg(pose, side, ankle, foot_orient, toe_orient=None, report=None):
    solve_limb(pose, side + "UpLeg", side + "Leg", ankle,
               FORWARD + LEFT * (0.12 if side == "Left" else -0.12), report)
    pose.place(side + "Foot", pose.head(side + "Foot"), foot_orient)
    if toe_orient is not None:
        pose.place(side + "ToeBase", pose.head(side + "ToeBase"), toe_orient)


def place_hips(pose, head, rotation):
    rest = pose.rig.rest_orient["Hips"]
    pose.place("Hips", head, rotation @ rest)


# ---------------------------------------------------------------------------
# Clips
# ---------------------------------------------------------------------------

def blend_bones(pose, target, bones, weight):
    """Slerp the basis rotations of `bones` from `pose` towards `target` (locations kept)."""
    for bone in bones:
        q0 = pose.basis[bone].to_quaternion()
        q1 = target.basis[bone].to_quaternion()
        location = pose.basis[bone].translation
        pose.basis[bone] = Matrix.Translation(location) @ q0.slerp(q1, weight).to_matrix().to_4x4()
    pose.cache.clear()


ARM_BONES = ("Arm", "ForeArm", "Hand")
FINGER_BONES = ("HandIndex1", "HandMiddle1", "HandRing1", "HandPinky1", "HandThumb1")


def stair_point(n, c):
    """Tread n centre (forward) and top (height) relative to the root, glTF metres."""
    return STAIR_RUN * (n - c), -STAIR_RISE * (n - c) + STAIR_TOP_OFFSET


def foot_on_tread(rig, side, n, c, pitch):
    """Ankle, foot and toe orientation for a foot standing on tread n (ball fixed)."""
    forward, top = stair_point(n, c)
    rest_ankle = rig.head(side + "Foot")
    rest_ball = rig.head(side + "ToeBase")
    sign = 1 if side == "Left" else -1
    lateral = sign * (STAIR_FOOT_WIDTH + (rest_ball.x - rest_ankle.x) * sign)
    ball = g2b(lateral, top + SOLE_TO_BALL, forward + FOOT_ON_TREAD + FOOT_CENTRE_TO_BALL)
    turn = rot(LEFT, pitch)
    ankle = ball + turn @ (rest_ankle - rest_ball)
    return ankle, turn @ rig.rest_orient[side + "Foot"]


def foot_state(rig, side, c):
    """Ankle position, foot orientation and toe orientation for StairsDown."""
    parity = 1 if side == "Left" else 0
    n = parity + 2 * math.floor((c - STEP_LAND - parity) / 2)
    u = c - n
    toe_rest = rig.rest_orient[side + "ToeBase"]
    if u <= STEP_LIFT:
        # Stance: ball fixed on tread n, heel settles after landing and rises before lift.
        if u < HEEL_DOWN:
            pitch = LAND_PITCH * (1 - smooth((u - STEP_LAND) / (HEEL_DOWN - STEP_LAND)))
        elif u > HEEL_UP:
            pitch = LIFT_PITCH * smooth((u - HEEL_UP) / (STEP_LIFT - HEEL_UP))
        else:
            pitch = 0.0
        ankle, foot = foot_on_tread(rig, side, n, c, pitch)
        return ankle, foot, toe_rest, True
    # Swing from tread n to tread n + 2 (positions in the root frame at c).
    s = (u - STEP_LIFT) / (2 + STEP_LAND - STEP_LIFT)
    a0, _ = foot_on_tread(rig, side, n, c, LIFT_PITCH)
    a1, _ = foot_on_tread(rig, side, n + 2, c, LAND_PITCH)
    reach_forward = smooth(s / 0.85)
    drop = smooth(s) ** 1.4
    ankle = Vector((lerp(a0.x, a1.x, s), lerp(a0.y, a1.y, reach_forward), lerp(a0.z, a1.z, drop)))
    ankle.z += SWING_LIFT * math.sin(math.pi * s) ** 1.2
    pitch = keyframes([(0.0, LIFT_PITCH), (0.45, SWING_MID_PITCH), (1.0, LAND_PITCH)], s)
    foot = rot(LEFT, pitch) @ rig.rest_orient[side + "Foot"]
    # Toes follow the foot mid-swing and are flat again for the toes-first landing.
    toe_pitch = pitch * smooth(s / 0.35) * (1 - smooth((s - 0.65) / 0.35))
    return ankle, foot, rot(LEFT, toe_pitch) @ toe_rest, False


def build_stairs_down(rig, idle, reach_report):
    base = sample_action(rig, idle, 0)
    poses = []
    steps = STAIRS_FRAMES * 2
    for i in range(steps + 1):
        frame = i / 2
        c = 2.0 * frame / STAIRS_FRAMES
        pose = base.copy()
        side_wave = math.cos(math.pi * (c - 0.25))  # +1: right single support, left leg swinging
        height = STAIR_HIP_HEIGHT + STAIR_HIP_BOB * math.cos(2 * math.pi * (c - 0.30))
        hips_head = g2b(-STAIR_HIP_SWAY * side_wave, height, STAIR_HIP_FORWARD)
        place_hips(pose, hips_head, rot(UP, -4 * side_wave) @ rot(FORWARD, -2 * side_wave) @ rot(LEFT, 3))
        # Upright torso, counter-rotated shoulders, gaze down the stairs.
        pose.rotate("Spine", rot(UP, 2.5 * side_wave) @ rot(LEFT, -1))
        pose.rotate("Spine1", rot(UP, 2.5 * side_wave) @ rot(FORWARD, 1.5 * side_wave))
        pose.rotate("Spine2", rot(LEFT, 1))
        pose.rotate("Neck", rot(LEFT, 6) @ rot(UP, -1.5 * side_wave))
        pose.rotate("Head", rot(LEFT, 9))
        # Relaxed arms with a small counter swing (right arm forward while left leg swings).
        pose.rotate("RightArm", rot(LEFT, -7 * side_wave) @ rot(FORWARD, -3))
        pose.rotate("LeftArm", rot(LEFT, 7 * side_wave) @ rot(FORWARD, 3))
        pose.rotate("RightForeArm", rot(LEFT, -4 - 4 * max(0.0, side_wave)))
        pose.rotate("LeftForeArm", rot(LEFT, -4 - 4 * max(0.0, -side_wave)))
        for side in ("Left", "Right"):
            ankle, foot, toe, _ = foot_state(rig, side, c)
            plant_leg(pose, side, ankle, foot, toe, reach_report)
        poses.append((frame, pose))
    return poses


def stand_base(rig, idle):
    """Idle frame 0 with the feet remembered for leg IK."""
    pose = sample_action(rig, idle, 0)
    feet = {side: (pose.head(side + "Foot"), pose.orient(side + "Foot")) for side in ("Left", "Right")}
    return pose, feet


def build_wave(rig, idle):
    base, feet = stand_base(rig, idle)
    poses = []
    for frame in range(WAVE_FRAMES + 1):
        pose = base.copy()
        sway = wave(frame, WAVE_FRAMES, 1)
        breath = wave(frame, WAVE_FRAMES, 1, 0.25)
        hips = pose.head("Hips") + LEFT * (0.008 * sway)
        pose.place("Hips", hips, rot(FORWARD, -1.0 * sway) @ pose.orient("Hips"))
        for side in ("Left", "Right"):
            plant_leg(pose, side, *feet[side])
        pose.rotate("Spine", rot(FORWARD, 1.0 * sway) @ rot(LEFT, 0.5 * breath))
        pose.rotate("Spine2", rot(FORWARD, -2.0) @ rot(UP, 4.0))
        # Friendly head tilt with a little bob in time with the wave.
        bob = wave(frame, WAVE_FRAMES, WAVE_COUNT, 0.25)
        pose.rotate("Neck", rot(FORWARD, -3.0) @ rot(UP, 2.0))
        pose.rotate("Head", rot(FORWARD, -6.0 + 1.0 * bob) @ rot(LEFT, -2.0 + 1.5 * bob))
        # Right shoulder lifts with the raised arm.
        pose.rotate("RightShoulder", rot(FORWARD, -10.0))
        shoulder = pose.head("RightArm")
        l1, l2 = rig.hinge["RightArm:lengths"]
        upper_dir = (-LEFT * 0.80 + FORWARD * 0.38 - UP * 0.12).normalized()
        elbow = shoulder + upper_dir * l1
        swing = WAVE_SWING * wave(frame, WAVE_FRAMES, WAVE_COUNT)
        # Forearm points up, tilted a little outward, swinging side to side about the forward axis.
        fore_dir = rot(FORWARD, 8.0 + swing) @ (UP * 0.97 + FORWARD * 0.12).normalized()
        wrist = elbow + fore_dir * l2
        lag = WAVE_SWING * 0.45 * wave(frame, WAVE_FRAMES, WAVE_COUNT, -0.12)
        fingers = rot(FORWARD, 8.0 + swing + lag) @ (UP + FORWARD * 0.05)
        orient = hand_orient(rig, "RightHand", fingers, FORWARD - UP * 0.05)
        place_hand(pose, "Right", orient, wrist, elbow - shoulder, 0.5)
        curl(pose, "Right", 6, 8, 10, 12, thumb=4, thumb_swing=-10, spread=8)
        poses.append((frame, pose))
    return poses


def build_lean_rail(rig, idle):
    base, feet = stand_base(rig, idle)
    poses = []
    for frame in range(RAIL_FRAMES + 1):
        pose = base.copy()
        shift = wave(frame, RAIL_FRAMES, 1, 0.1)
        breath = wave(frame, RAIL_FRAMES, 2)
        look = math.cos(2 * math.pi * frame / RAIL_FRAMES)  # 1: looking down, -1: looking up
        hips = pose.head("Hips") + FORWARD * (-0.045) + LEFT * (0.016 * shift) - UP * (0.003 + 0.004 * abs(shift))
        pose.place("Hips", hips, rot(FORWARD, -1.5 * shift) @ rot(LEFT, 4.0) @ pose.orient("Hips"))
        for side in ("Left", "Right"):
            plant_leg(pose, side, *feet[side])
        lean = RAIL_LEAN - 4.0
        pose.rotate("Spine", rot(LEFT, lean * 0.40 + 0.8 * breath) @ rot(FORWARD, 1.5 * shift))
        pose.rotate("Spine1", rot(LEFT, lean * 0.35 + 0.5 * breath))
        pose.rotate("Spine2", rot(LEFT, lean * 0.25) @ rot(FORWARD, -1.0 * shift))
        pose.rotate("Neck", rot(LEFT, 4.0 + 8.0 * look))
        pose.rotate("Head", rot(LEFT, 2.0 + 12.0 * look) @ rot(UP, 3.0 * wave(frame, RAIL_FRAMES, 1, 0.3)))
        for side, sign in (("Left", 1), ("Right", -1)):
            # Shoulders rise a little while leaning on the hands.
            pose.rotate(side + "Shoulder", rot(FORWARD, sign * 5.0) @ rot(UP, -sign * 4.0))
            fingers = (FORWARD - LEFT * sign * 0.12 - UP * 0.10).normalized()
            orient = hand_orient(rig, side + "Hand", fingers, -UP)
            # The palm rests on the middle of the rail, a little proud of its top, so the knuckles reach past the
            # front edge and the curled fingers wrap over it instead of cutting into the corner.
            contact = g2b(sign * RAIL_HAND_SPACING, RAIL_TOP + 0.006, RAIL_FORWARD)
            wrist = wrist_for(rig, side + "Hand", orient, contact)
            pole = Vector((sign * 0.45, 1.0, -0.25))
            place_hand(pose, side, orient, wrist, pole, 0.5)
            curl(pose, side, 48, 55, 58, 60, thumb=10, thumb_swing=10)
        poses.append((frame, pose))
    return poses


def glass_in_hand(rig):
    """Glass centre and up axis in the right hand bone's local space (constant grip)."""
    f = Vector((0, 1, 0))
    p = rig.palm_local["RightHand"]
    p = (p - f * p.dot(f)).normalized()
    thumb = f.cross(p)  # right hand: towards the thumb
    # The glass axis runs through the cupped palm; the hand holds its lower half. With
    # GLASS_GRIP_TILT > 0 the glass lies obliquely across the palm, its top leaning to the fingers.
    up = (thumb * math.cos(math.radians(GLASS_GRIP_TILT)) + f * math.sin(math.radians(GLASS_GRIP_TILT))).normalized()
    centre = f * 0.072 + p * (PALM_SKIN + GLASS_RADIUS) + up * GLASS_GRIP_HEIGHT
    return centre, up, p


def hand_for_glass(rig, centre, up, palm_dir):
    """Right hand orientation and wrist that hold the glass at `centre` with axis `up`."""
    local_centre, local_up, local_palm = glass_in_hand(rig)
    hand = frame_from(up, palm_dir) @ frame_from(local_up, local_palm).transposed()
    return hand, centre - hand @ local_centre


def wrist_bend(pose):
    """Right wrist bend (degrees): the hand axis against its rest direction on the forearm."""
    neutral = pose.orient("RightForeArm") @ pose.rig.local_rest["RightHand"].to_3x3().normalized() @ Vector((0, 1, 0))
    return math.degrees(neutral.angle(pose.orient("RightHand").col[1]))


def forearm_in_counter(elbow, wrist, radius=0.045):
    """How deep (metres) the forearm, as a capsule, reaches into the counter top and front."""
    deepest = 0.0
    for k in range(6):
        p = elbow.lerp(wrist, k / 5)
        height, forward = p.z, -p.y
        if forward > COUNTER_EDGE - radius:
            deepest = max(deepest, min(COUNTER_TOP + radius - height, forward - (COUNTER_EDGE - radius)))
    return deepest


def natural_grip(pose, centre, up, palm, pole, previous):
    """Small corrections that keep the wrist near neutral: turn the hand round the glass axis
    and swing the elbow round the shoulder-wrist line (degrees). Soft pulls keep the result
    close to the keyed palm / pole and to the previous frame, so the motion stays smooth."""
    rig = pose.rig
    shoulder = pose.head("RightArm")

    def cost(turn, swing):
        hand, wrist = hand_for_glass(rig, centre, up, Quaternion(up, math.radians(turn)) @ palm)
        trial = pose.copy()
        reach = []
        axis = (wrist - shoulder).normalized()
        place_hand(trial, "Right", hand, wrist, Quaternion(axis, math.radians(swing)) @ pole, 0.5, reach)
        value = max(0.0, wrist_bend(trial) - 8.0) + 200.0 * max(0.0, reach[0] - 0.97)
        value += 3000.0 * forearm_in_counter(trial.head("RightForeArm"), trial.head("RightHand"))
        value += 0.1 * (abs(turn) + abs(swing)) + 0.5 * (abs(turn - previous[0]) + abs(swing - previous[1]))
        return value

    best = min((cost(t, w), t, w) for t in range(-60, 61, 10) for w in range(-60, 61, 10))
    _, turn, swing = best
    for step in (5.0, 2.5):
        best = min((cost(turn + dt, swing + dw), turn + dt, swing + dw)
                   for dt in (-step, 0, step) for dw in (-step, 0, step))
        _, turn, swing = best
    return turn, swing


def bend_at_hips(pose, degrees):
    """Pitch the pelvis forward while the thighs keep their orientation (feet stay planted).
    The hip joints lie on the pitch axis through the Hips head, so they do not move."""
    pose.rotate("Hips", rot(LEFT, degrees))
    for side in ("Left", "Right"):
        pose.rotate(side + "UpLeg", rot(LEFT, -degrees))


def build_drink(rig, idle, props, reach_report):
    """Pick the glass up from the counter, drink, hold it at the chest, put it back."""
    poses = []
    idle_length = idle.frame_range[1]
    local_centre, local_up, _ = glass_in_hand(rig)
    start = sample_action(rig, idle, 0)
    lip_local = start.matrix("Head").inverted() @ LOWER_LIP_REST
    start_hand = start.matrix("RightHand").normalized()
    start_centre = start_hand @ local_centre
    start_up = start_hand.to_3x3() @ local_up
    start_palm = start_hand.to_3x3() @ rig.palm_local["RightHand"]
    reach_palm = (LEFT + FORWARD * DRINK_REACH_PALM).normalized()
    chest_palm = (LEFT + FORWARD * 0.6).normalized()
    rest = GLASS_REST
    approach = rest + g2b(-0.03, 0.045, -0.08)   # open hand just behind / above the glass
    grab, release = DRINK_GRAB, DRINK_RELEASE
    previous = (0.0, 0.0)
    for frame in range(DRINK_FRAMES + 1):
        t = frame
        # Idle body underneath, slowed so that frame 120 is Idle frame 0 again.
        idle_frame = t * 2 * idle_length / DRINK_FRAMES
        idle_frame -= idle_length * math.floor(idle_frame / idle_length + 1e-9)
        pose = sample_action(rig, idle, idle_frame)
        fk = pose.copy()
        # Standing a step back from the counter, the person reaches the glass with a nearly straight arm and a
        # slight bend at the hips, the torso turning a little towards it and the head looking down.
        lean = keyframes([(0, 0.0), (16, 1.0), (grab + 5, 1.0), (42, 0.0), (82, 0.0), (98, 1.0),
                          (release + 2, 1.0), (DRINK_FRAMES, 0.0)], t)
        bend_at_hips(pose, DRINK_HIP_BEND * lean)
        pose.rotate("Spine", rot(LEFT, 3 * lean) @ rot(UP, -4 * lean))
        pose.rotate("Spine1", rot(LEFT, 3 * lean) @ rot(UP, -4 * lean))
        pose.rotate("RightShoulder", rot(UP, 12 * lean) @ rot(FORWARD, 4 * lean))
        pose.rotate("Neck", rot(LEFT, 6 * lean))
        pose.rotate("Head", rot(LEFT, 8 * lean) @ rot(UP, -6 * lean))
        # Sip window: the glass tips against the lower lip, the head tilts back with the chin up.
        sip = smooth((t - 38) / 8) * (1 - smooth((t - 59.5) / 7))
        pose.rotate("Spine2", rot(LEFT, -2.0 * sip))
        pose.rotate("Neck", rot(LEFT, -7.0 * sip))
        pose.rotate("Head", rot(LEFT, -11.0 * sip))
        lip = pose.matrix("Head") @ lip_local
        # Glass tilt: back towards the face, its top rolled a little to the right so that the
        # forearm can run across in front of the chin with a near-neutral wrist.
        tilt = keyframes([(38, 0.0), (46, SIP_TILT_FIRST), (52, 33.0), (55, SIP_TILT_MAX), (58, 34.0),
                          (62, 20.0), (68, 0.0)], t)
        tip = rot(FORWARD, SIP_ROLL * sip) @ rot(LEFT, -tilt)
        tilted_up = tip @ UP
        towards_face = tip @ Vector((0, 1, 0))
        at_lip = lip - tilted_up * (GLASS_HEIGHT * 0.5) - towards_face * GLASS_RADIUS + FORWARD * 0.004
        centre = keyframes([(0, start_centre), (10, g2b(-0.19, 1.10, 0.33)), (17, approach),
                            (grab - 3, rest), (grab + 3, rest), (33, rest + UP * 0.07 - FORWARD * 0.05),
                            (40, g2b(-0.10, 1.18, 0.30)), (46, at_lip), (58, at_lip),
                            (70, g2b(-0.11, 1.14, 0.27)), (82, g2b(-0.115, 1.135, 0.275)),
                            (93, rest + UP * 0.08 - FORWARD * 0.06), (release - 3, rest), (release + 3, rest),
                            (111, rest + UP * 0.05 - FORWARD * 0.03), (115, approach + UP * 0.03),
                            (DRINK_FRAMES, start_centre)], t)
        up = keyframes([(0, start_up), (14, UP.copy()), (113, UP.copy()), (DRINK_FRAMES, start_up)], t)
        if 38 <= t <= 68:
            up = tilted_up
        palm = keyframes([(0, start_palm), (14, reach_palm), (grab + 3, reach_palm), (42, chest_palm),
                          (84, chest_palm), (96, reach_palm), (113, reach_palm),
                          (DRINK_FRAMES, start_palm)], t).normalized()
        # While sipping the palm turns towards the face: the hand sits in front of the glass,
        # its back facing forward and to the right, fingers round the far side.
        turn = math.radians(SIP_PALM_TURN)
        sip_palm = LEFT * math.cos(turn) + towards_face * math.sin(turn)
        palm = Quaternion().slerp(palm.rotation_difference(sip_palm.normalized()), sip) @ palm
        # Elbow path: out to the side while the glass rises, then forward and out at about
        # shoulder height for the sip, rising as the glass tips (root-local targets).
        elbow = keyframes([(34, SIP_ELBOW_RISE), (40, SIP_ELBOW_RISE), (46, SIP_ELBOW_LOW), (55, SIP_ELBOW_HIGH),
                           (58, SIP_ELBOW_HIGH), (61, SIP_ELBOW_LOW), (66, SIP_ELBOW_RISE)], t)
        aim = smooth((t - 30) / 6) * (1 - smooth((t - 64) / 8))
        sip_pole = (elbow - pose.head("RightArm")).normalized()
        # At the counter the elbow drops low and forward so the forearm stays near level.
        rest_pole = Vector((-0.6, 0.35, -1.0)).normalized().lerp(COUNTER_ELBOW_POLE.normalized(), lean)
        pole = rest_pole.lerp(sip_pole, aim)
        # Outside the sip, small corrections keep the wrist near neutral (the glass keeps its
        # path); during the sip the keyed hand turn and elbow are used as they are.
        up = up.normalized()
        previous = natural_grip(pose, centre, up, palm, pole, previous)
        turn, swing = (value * (1 - sip) for value in previous)
        palm = Quaternion(up, math.radians(turn)) @ palm
        hand, wrist = hand_for_glass(rig, centre, up, palm)
        pole = Quaternion((wrist - pose.head("RightArm")).normalized(), math.radians(swing)) @ pole
        ik = pose.copy()
        place_hand(ik, "Right", hand, wrist, pole, 0.5, reach_report)
        # Blend in from the Idle arm at the start and back to it at the end.
        weight = smooth(t / 8) * (1 - smooth((t - 113) / 7))
        blend_bones(pose, ik, ["Right" + b for b in ARM_BONES], weight)
        # Fingers: open while reaching, closed from just before the grab to just after the release.
        opened = smooth(t / 10) * (1 - smooth((t - 112) / 8))
        closed = smooth((t - (grab - 6)) / 6) * (1 - smooth((t - (release + 1)) / 6))
        open_hand = pose.copy()
        curl(open_hand, "Right", 0, 2, 4, 6, thumb=-5, thumb_swing=-15)
        gripped = pose.copy()
        curl(gripped, "Right", 72, 80, 84, 86, thumb=35, thumb_swing=30)
        fingers = ["Right" + b for b in FINGER_BONES]
        blend_bones(pose, open_hand, fingers, opened)
        blend_bones(pose, gripped, fingers, closed)
        hand_m = pose.matrix("RightHand").normalized()
        neutral = pose.orient("RightForeArm") @ rig.local_rest["RightHand"].to_3x3().normalized() @ Vector((0, 1, 0))
        props.setdefault("drink_wrist", {})[frame] = (
            math.degrees(neutral.angle(hand_m.to_3x3().col[1])),
            math.degrees(pose.orient("RightForeArm").col[1].angle(hand_m.to_3x3().col[1])))
        props.setdefault("glass", {})[frame] = {
            "centre": list(hand_m @ local_centre) if grab <= t <= release else list(rest),
            "hand_centre": list(hand_m @ local_centre),
            "up": list((hand_m.to_3x3() @ local_up).normalized()) if grab <= t <= release else [0, 0, 1],
        }
        poses.append((frame, pose))
    return poses


# ---------------------------------------------------------------------------
# Writing actions
# ---------------------------------------------------------------------------

def take_figure_mesh(body, blend_path):
    """Use the Body mesh saved in the .blend, so faces painted or cut in Blender carry over to the GLB."""
    path = Path(blend_path)
    if not path.exists():
        print("No %s yet: the figure keeps the backup's plain mesh" % path.name)
        return
    with bpy.data.libraries.load(str(path), link=False) as (source, target):
        target.meshes = [name for name in source.meshes if name == "Body"]
    if not target.meshes:
        print("No Body mesh in %s: the figure keeps the backup's plain mesh" % path.name)
        return
    mesh = target.meshes[0]
    # The appended mesh is local now; drop the library entry so the same .blend can be saved over later.
    for library in list(bpy.data.libraries):
        bpy.data.libraries.remove(library)
    previous = body.data
    body.data = mesh
    bpy.data.meshes.remove(previous)
    mesh.name = "Body"
    # Appending brings a second copy of the grey material ("Body.001"); point the slot back at the imported one.
    for index, material in enumerate(mesh.materials):
        base = material.name.rsplit(".", 1)[0] if material else None
        if material and base != material.name and base in bpy.data.materials:
            mesh.materials[index] = bpy.data.materials[base]
            bpy.data.materials.remove(material)
    # The vertex weights follow the object's vertex groups, which come from the same import in the same order.
    print("Took the Body mesh from %s: %d faces, materials %s" % (path.name, len(mesh.polygons), [m.name for m in mesh.materials]))


MOUTH_LINE = 1.5615          # height where the lips meet (Blender z)
MOUTH_CORNER = 0.036         # half the mouth's width; the key fades out from 0.026


def add_closed_mouth(body):
    """Add the shape key "MouthClosed", in which the lips meet.

    The sculpted mouth is a deep groove between the lips, up to 13 mm behind
    their front, which reads as a mouth hanging open. The key brings the groove
    forward to just behind the lips' front and halfway towards the line where
    they meet, fading out towards the corners. The site keeps it on, and lets it
    go only while the figure drinks. The front of the lips curves back towards
    the corners, at y = -0.0975 + 6 x^2.
    """
    if body.data.shape_keys:
        body.shape_key_clear()
    body.shape_key_add(name="Basis", from_mix=False)
    closed = body.shape_key_add(name="MouthClosed", from_mix=False)
    to_world = body.matrix_world
    to_local = to_world.inverted()
    for vertex in body.data.vertices:
        point = to_world @ vertex.co
        if abs(point.x) > MOUTH_CORNER or not 1.552 < point.z < 1.567 or point.y < -0.105:
            continue
        depth = point.y - (-0.0975 + 6.0 * point.x * point.x)
        if depth <= 0.0015:
            continue
        weight = 1.0 - smooth((abs(point.x) - 0.026) / (MOUTH_CORNER - 0.026))
        point.y -= weight * (depth - 0.0015) * 0.85
        point.z += weight * (MOUTH_LINE - point.z) * 0.45
        closed.data[vertex.index].co = to_local @ point


def prepare_for_painting(armature, body):
    """Open the .blend ready for editing the paint: rest pose, Body selected, the face in a front view."""
    armature.data.pose_position = "REST"
    for obj in bpy.context.view_layer.objects:
        obj.select_set(False)
    body.select_set(True)
    bpy.context.view_layer.objects.active = body
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type != "VIEW_3D":
                continue
            space = area.spaces.active
            space.shading.type = "SOLID"
            space.shading.color_type = "MATERIAL"
            view = space.region_3d
            view.view_perspective = "PERSP"
            # Blender's front view looks along +Y, onto the figure's face.
            view.view_rotation = Quaternion((1, 0, 0), math.radians(90))
            view.view_location = (0, 0, 1.58)
            view.view_distance = 0.75


def write_action(armature, name, poses):
    """Write every bone's location / rotation / scale as LINEAR keys."""
    old = bpy.data.actions.get(name)
    if old:
        bpy.data.actions.remove(old)
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    slot = action.slots.new(id_type='OBJECT', name=armature.name)
    layer = action.layers.new("Layer")
    strip = layer.strips.new(type='KEYFRAME')
    bag = strip.channelbags.new(slot)
    rig_names = list(poses[0][1].basis.keys())
    for bone in rig_names:
        group = bag.groups.new(bone)
        samples = []
        previous = None
        for frame, pose in poses:
            loc, quat, scale = pose.basis[bone].decompose()
            if previous is not None and previous.dot(quat) < 0:
                quat.negate()
            previous = quat
            samples.append((frame, loc, quat, scale))
        for prop, count, pick in (("location", 3, lambda s: s[1]),
                                  ("rotation_quaternion", 4, lambda s: s[2]),
                                  ("scale", 3, lambda s: s[3])):
            path = 'pose.bones["%s"].%s' % (bone, prop)
            for index in range(count):
                curve = bag.fcurves.new(path, index=index)
                curve.group = group
                curve.keyframe_points.add(len(samples))
                flat = []
                for sample in samples:
                    flat += [sample[0], pick(sample)[index]]
                curve.keyframe_points.foreach_set("co", flat)
                for point in curve.keyframe_points:
                    point.interpolation = 'LINEAR'
                curve.update()
    track = armature.animation_data.nla_tracks.new()
    track.name = name
    nla = track.strips.new(name, 0, action)
    nla.action_slot = slot
    return action


REST_VALUES = {"location": (0.0, 0.0, 0.0), "rotation_quaternion": (1.0, 0.0, 0.0, 0.0), "scale": (1.0, 1.0, 1.0)}


def drop_resting_channels():
    """Remove each bone property that stays at rest for a whole action.

    Every clip keys every bone's location, rotation and scale, though most bones
    never move or scale: those channels would only add data and file overhead.
    Without a channel, three.js leaves the bone at its rest pose, which is the
    same value. A rotation of -1 (the same turn as +1) also counts as rest.
    """
    dropped = 0
    for action in bpy.data.actions:
        for layer in action.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    properties = {}
                    for curve in bag.fcurves:
                        properties.setdefault(curve.data_path, []).append(curve)
                    for path, curves in properties.items():
                        rest = REST_VALUES.get(path.rsplit(".", 1)[-1])
                        if rest is None or len(curves) != len(rest):
                            continue
                        values = [[point.co[1] for point in curve.keyframe_points] for curve in curves]
                        def at_rest(sign):
                            return all(abs(v - sign * rest[curve.array_index]) < 1e-4
                                       for curve, keys in zip(curves, values) for v in keys)
                        if at_rest(1) or (path.endswith("rotation_quaternion") and at_rest(-1)):
                            for curve in curves:
                                bag.fcurves.remove(curve)
                            dropped += 1
    print("Dropped %d bone properties that stay at rest" % dropped)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    args = read_args()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = FPS
    bpy.ops.import_scene.gltf(filepath=args["input"])

    # The importer adds an Icosphere as the bone display shape (collection
    # "glTF_not_exported"); it is not part of the GLB, so drop it.
    armature = bpy.data.objects["Armature"]
    for bone in armature.pose.bones:
        bone.custom_shape = None
    for obj in list(bpy.data.objects):
        if obj.name.startswith("Icosphere"):
            bpy.data.objects.remove(obj)
    for collection in list(bpy.data.collections):
        if collection.name.startswith("glTF_not_exported") and not collection.objects:
            bpy.data.collections.remove(collection)

    take_figure_mesh(bpy.data.objects["Body"], args["blend"])

    rig = Rig(armature)
    actions = bpy.data.actions
    props = {}
    reach = []
    drink_reach = []
    clips = [
        ("StairsDown", build_stairs_down(rig, actions["Idle"], reach)),
        ("Wave", build_wave(rig, actions["Idle"])),
        ("LeanRail", build_lean_rail(rig, actions["Idle"])),
        ("Drink", build_drink(rig, actions["Idle"], props, drink_reach)),
    ]
    print("StairsDown leg reach (max / leg length): %.3f" % max(reach))
    print("Drink arm reach: %.3f" % max(drink_reach))
    glass_centre, _, _ = glass_in_hand(rig)
    print("Glass centre in RightHand space (GLASS_OFFSET): (%.4f, %.4f, %.4f)" % tuple(glass_centre))
    for name, poses in clips:
        write_action(armature, name, poses)
        print("Built %-10s %5.1f frames" % (name, poses[-1][0]))

    drop_resting_channels()
    add_closed_mouth(bpy.data.objects["Body"])
    armature.animation_data.action = actions["Idle"]
    armature.animation_data.action_slot = actions["Idle"].slots[0]
    bpy.ops.export_scene.gltf(
        filepath=args["output"],
        export_format='GLB',
        export_animation_mode='ACTIONS',
        export_force_sampling=False,  # keep the original keys (fractional frames) untouched
        # The site shades the figure flat in the shader and works out normals on load, so the file carries none.
        export_normals=False,
        # Draco packs the mesh. The animation keys stay as they are: meshopt would pack them too, but its rounding
        # moves the hands and feet by up to 15 mm, off the rail, the glass and the treads they are posed against.
        export_draco_mesh_compression_enable=True,
        export_cameras=False,
        export_lights=False,
        export_extras=False,
    )
    Path(args["blend"]).parent.mkdir(parents=True, exist_ok=True)
    # The shape key is made afresh on every export; the .blend for painting keeps the plain mesh.
    bpy.data.objects["Body"].shape_key_clear()
    prepare_for_painting(armature, bpy.data.objects["Body"])
    bpy.ops.wm.save_as_mainfile(filepath=args["blend"], compress=True)
    print("Saved", args["blend"])
    if args["props-json"]:
        Path(args["props-json"]).write_text(json.dumps(props, indent=1))
    print("Exported", args["output"])


if __name__ == "__main__":
    main()
