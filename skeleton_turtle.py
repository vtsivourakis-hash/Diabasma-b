"""Draw a detailed, front-facing human skeleton with Python Turtle.

Run with:
    python skeleton_turtle.py

Controls:
    L       toggle anatomical labels
    S       save the drawing as skeleton.eps
    Escape  close the window
"""

import math
import turtle


WIDTH, HEIGHT = 920, 1000
TITLE = "Detailed Human Skeleton — Python Turtle"
BG = "#10131a"
BONE = "#eee6ce"
BONE_LIGHT = "#fffaf0"
OUTLINE = "#887f6a"
JOINT = "#d8cfb7"
CARTILAGE = "#8fb2be"
HOLE = "#10131a"
LABEL = "#aeb8c7"

screen = turtle.Screen()
screen.setup(WIDTH, HEIGHT)
screen.title(TITLE)
screen.bgcolor(BG)
screen.tracer(0, 0)

pen = turtle.Turtle(visible=False)
pen.speed(0)
pen.penup()

label_pen = turtle.Turtle(visible=False)
label_pen.speed(0)
label_pen.penup()

labels_visible = True


def go(x, y):
    pen.penup()
    pen.goto(x, y)


def stroke(points, color=BONE, width=3, close=False):
    """Draw a connected polyline."""
    if not points:
        return
    pen.color(color)
    pen.pensize(width)
    go(*points[0])
    pen.pendown()
    for point in points[1:]:
        pen.goto(*point)
    if close:
        pen.goto(*points[0])
    pen.penup()


def polygon(points, fill=BONE, outline=OUTLINE, width=2):
    pen.color(outline, fill)
    pen.pensize(width)
    go(*points[0])
    pen.begin_fill()
    pen.pendown()
    for point in points[1:]:
        pen.goto(*point)
    pen.goto(*points[0])
    pen.end_fill()
    pen.penup()


def ellipse(cx, cy, rx, ry, fill=None, outline=BONE, width=2, steps=90):
    points = [
        (cx + rx * math.cos(2 * math.pi * i / steps),
         cy + ry * math.sin(2 * math.pi * i / steps))
        for i in range(steps)
    ]
    if fill is None:
        stroke(points, outline, width, close=True)
    else:
        polygon(points, fill, outline, width)


def bezier(p0, p1, p2, p3, color=BONE, width=3, steps=28):
    points = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        x = u**3*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t**3*p3[0]
        y = u**3*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t**3*p3[1]
        points.append((x, y))
    stroke(points, color, width)


def dot(x, y, size, color=BONE):
    go(x, y)
    pen.dot(size, color)


def bone(a, b, width=9, joints=True):
    """Draw a long bone with a dark rim and rounded epiphyses."""
    stroke([a, b], OUTLINE, width + 4)
    stroke([a, b], BONE, width)
    if joints:
        for x, y in (a, b):
            dot(x, y, width + 9, OUTLINE)
            dot(x, y, width + 5, JOINT)


def label(text, anchor, text_pos, align="left"):
    """Add a leader line and a label on a separate Turtle layer."""
    if not labels_visible:
        return
    label_pen.color(LABEL)
    label_pen.pensize(1)
    label_pen.goto(*anchor)
    label_pen.pendown()
    label_pen.goto(*text_pos)
    label_pen.penup()
    x, y = text_pos
    label_pen.goto(x + (5 if align == "left" else -5), y - 5)
    label_pen.write(text, align=align, font=("Arial", 9, "normal"))


def draw_skull():
    # Cranium and temporal contour.
    ellipse(0, 385, 63, 75, BONE_LIGHT, OUTLINE, 3)
    bezier((-56, 410), (-74, 368), (-54, 329), (-34, 321), OUTLINE, 3)
    bezier((56, 410), (74, 368), (54, 329), (34, 321), OUTLINE, 3)

    # Eye sockets, nasal opening, cheek arches and ear openings.
    ellipse(-25, 389, 17, 20, HOLE, OUTLINE, 2)
    ellipse(25, 389, 17, 20, HOLE, OUTLINE, 2)
    polygon([(-7, 371), (0, 351), (8, 371), (3, 382), (-3, 382)], HOLE, OUTLINE, 1)
    ellipse(-51, 365, 7, 10, HOLE, OUTLINE, 1)
    ellipse(51, 365, 7, 10, HOLE, OUTLINE, 1)
    bezier((-42, 368), (-34, 350), (-24, 343), (-15, 347), OUTLINE, 3)
    bezier((42, 368), (34, 350), (24, 343), (15, 347), OUTLINE, 3)

    # Maxilla, mandible and individual teeth.
    bezier((-31, 346), (-18, 335), (18, 335), (31, 346), OUTLINE, 3)
    jaw = [(-34, 344), (-38, 318), (-25, 300), (0, 294),
           (25, 300), (38, 318), (34, 344), (24, 331), (0, 326), (-24, 331)]
    polygon(jaw, BONE, OUTLINE, 3)
    ellipse(0, 313, 17, 9, HOLE, OUTLINE, 1)
    for x in range(-25, 30, 10):
        polygon([(x-4, 343), (x+4, 343), (x+3, 331), (x-3, 331)], BONE_LIGHT, OUTLINE, 1)
    for x in range(-20, 25, 10):
        stroke([(x, 329), (x, 320)], OUTLINE, 1)

    # Cranial sutures.
    bezier((0, 459), (-9, 443), (9, 429), (0, 415), OUTLINE, 1)
    bezier((-58, 406), (-30, 416), (-18, 407), (0, 415), OUTLINE, 1)
    bezier((58, 406), (30, 416), (18, 407), (0, 415), OUTLINE, 1)


def draw_spine_and_chest():
    # Cervical, thoracic and lumbar vertebrae.
    spine_points = []
    for i in range(25):
        y = 292 - i * 13.2
        x = 3 * math.sin(i * 0.55)
        spine_points.append((x, y))
    stroke(spine_points, OUTLINE, 8)
    for i, (x, y) in enumerate(spine_points):
        w = 14 if i < 7 else (17 if i < 19 else 20)
        ellipse(x, y, w/2, 5.2, JOINT, OUTLINE, 1, 28)
        stroke([(x-w/2-4, y), (x+w/2+4, y)], OUTLINE, 1)

    # Clavicles and shoulder blades.
    bezier((-6, 279), (-42, 293), (-81, 294), (-126, 270), BONE, 7)
    bezier((6, 279), (42, 293), (81, 294), (126, 270), BONE, 7)
    bezier((-116, 269), (-145, 247), (-143, 207), (-113, 186), OUTLINE, 4)
    bezier((116, 269), (145, 247), (143, 207), (113, 186), OUTLINE, 4)
    polygon([(-118, 263), (-142, 225), (-111, 188), (-92, 239)], BG, OUTLINE, 3)
    polygon([(118, 263), (142, 225), (111, 188), (92, 239)], BG, OUTLINE, 3)

    # Sternum: manubrium, body and xiphoid process.
    polygon([(-12, 267), (12, 267), (15, 246), (10, 230),
             (9, 139), (0, 124), (-9, 139), (-10, 230), (-15, 246)],
            JOINT, OUTLINE, 2)
    stroke([(-12, 244), (12, 244)], CARTILAGE, 2)

    # Twelve pairs of ribs. Upper seven join the sternum; lower ribs taper.
    for i in range(12):
        y = 259 - i * 13
        spread = 78 + i * 5 if i < 7 else 113 - (i-7)*8
        drop = 20 + i * 2.3
        end_x = 13 if i < 7 else 25 + (i-7)*7
        rib_width = 4 if i < 8 else 3
        bezier((-7, y), (-spread*.58, y+11), (-spread, y-drop*.35), (-end_x, y-drop), BONE, rib_width)
        bezier((7, y), (spread*.58, y+11), (spread, y-drop*.35), (end_x, y-drop), BONE, rib_width)
        if i < 7:
            stroke([(-end_x, y-drop), (-10, y-drop+1)], CARTILAGE, 3)
            stroke([(end_x, y-drop), (10, y-drop+1)], CARTILAGE, 3)


def draw_pelvis():
    # Sacrum and coccyx.
    polygon([(-22, -30), (22, -30), (18, -86), (0, -108), (-18, -86)], JOINT, OUTLINE, 3)
    for y in (-45, -59, -73, -87):
        dot(-9, y, 4, HOLE)
        dot(9, y, 4, HOLE)
    stroke([(0, -106), (0, -119), (4, -130)], BONE, 6)

    # Ilium, ischium and pubis.
    left = [(-20, -35), (-60, -26), (-99, -40), (-112, -69), (-98, -106),
            (-72, -130), (-38, -125), (-16, -94), (-25, -75)]
    right = [(-x, y) for x, y in left]
    polygon(left, BONE, OUTLINE, 3)
    polygon(right, BONE, OUTLINE, 3)
    ellipse(-62, -84, 20, 27, HOLE, OUTLINE, 3)
    ellipse(62, -84, 20, 27, HOLE, OUTLINE, 3)
    ellipse(-88, -116, 12, 12, JOINT, OUTLINE, 2)
    ellipse(88, -116, 12, 12, JOINT, OUTLINE, 2)
    bezier((-42, -122), (-24, -142), (-10, -133), (0, -119), BONE, 8)
    bezier((42, -122), (24, -142), (10, -133), (0, -119), BONE, 8)
    stroke([(-13, -125), (13, -125)], CARTILAGE, 4)


def draw_arm(side):
    s = side
    shoulder = (s*127, 267)
    elbow = (s*178, 128)
    wrist = (s*207, -7)

    # Humerus, with a slightly angled shaft.
    bone(shoulder, elbow, 12)
    stroke([(s*140, 250), (s*166, 147)], BONE_LIGHT, 3)

    # Radius and ulna are separate and cross subtly toward the wrist.
    bone((s*173, 119), (s*198, -3), 6)
    bone((s*184, 122), (s*216, -1), 6)
    dot(*wrist, 16, JOINT)

    # Eight carpals in two rows.
    for row in range(2):
        for col in range(4):
            dot(s*(197 + col*6), -12-row*7, 7, JOINT)

    # Metacarpals and five articulated fingers.
    palm_y = -26
    finger_lengths = [25, 39, 44, 40, 32]
    for f in range(5):
        x0 = s*(196 + f*6)
        x1 = s*(199 + f*8)
        y1 = palm_y - 30
        bone((x0, palm_y), (x1, y1), 3, False)
        segments = 2 if f == 0 else 3
        length = finger_lengths[f]
        previous = (x1, y1)
        for seg in range(segments):
            drift = s*(-5 if f == 0 else (f-2)*1.2)
            current = (previous[0] + drift, previous[1] - length/segments)
            bone(previous, current, 2, False)
            dot(*previous, 4, JOINT)
            previous = current


def draw_leg(side):
    s = side
    hip = (s*88, -116)
    knee = (s*84, -305)
    ankle = (s*91, -450)

    # Femur and patella.
    bone(hip, knee, 15)
    stroke([(s*82, -140), (s*78, -280)], BONE_LIGHT, 4)
    ellipse(knee[0], knee[1]-2, 12, 16, JOINT, OUTLINE, 2)

    # Tibia and fibula.
    bone((s*77, -318), (s*79, -443), 11)
    bone((s*96, -318), (s*105, -445), 5)
    dot(*ankle, 17, JOINT)

    # Tarsals, metatarsals, heel and toes.
    heel = (s*73, -465)
    dot(*heel, 18, JOINT)
    for x, y in [(78, -456), (88, -460), (98, -462), (84, -470), (95, -472)]:
        dot(s*x, y, 9, JOINT)
    for toe in range(5):
        start = (s*(84 + toe*5), -472-toe*.5)
        end = (s*(104 + toe*9), -479 + abs(2-toe)*2)
        bone(start, end, 3, False)
        tip = (end[0] + s*(10 if toe < 2 else 7), end[1] + (2 if toe > 2 else 0))
        bone(end, tip, 2, False)


def draw_labels():
    label_pen.clear()
    label("Cranium", (48, 438), (155, 450))
    label("Mandible", (34, 315), (155, 332))
    label("Clavicle", (75, 286), (165, 296))
    label("Scapula", (126, 226), (176, 244))
    label("Sternum", (10, 211), (166, 208))
    label("Ribs", (100, 175), (166, 170))
    label("Vertebral column", (-8, 92), (-170, 102), "right")
    label("Pelvis", (82, -67), (166, -65))
    label("Humerus", (-154, 198), (-225, 219), "right")
    label("Radius + ulna", (-190, 57), (-245, 75), "right")
    label("Carpals / hand", (-211, -18), (-260, -20), "right")
    label("Femur", (88, -210), (168, -205))
    label("Patella", (84, -306), (167, -305))
    label("Tibia + fibula", (95, -380), (178, -380))
    label("Tarsals / foot", (94, -462), (178, -454))


def draw_title():
    pen.color(BONE_LIGHT)
    go(-435, 468)
    pen.write("HUMAN SKELETON", font=("Arial", 15, "bold"))
    pen.color(LABEL)
    go(-435, 445)
    pen.write("Anterior view  •  press L for labels  •  S to save", font=("Arial", 9, "normal"))


def toggle_labels():
    global labels_visible
    labels_visible = not labels_visible
    draw_labels()
    screen.update()


def save_drawing():
    screen.getcanvas().postscript(file="skeleton.eps", colormode="color")
    screen.title("Saved as skeleton.eps")
    screen.ontimer(lambda: screen.title(TITLE), 1600)


def draw_skeleton():
    draw_title()
    draw_skull()
    draw_spine_and_chest()
    draw_pelvis()
    draw_arm(-1)
    draw_arm(1)
    draw_leg(-1)
    draw_leg(1)
    draw_labels()
    screen.update()


screen.listen()
screen.onkey(toggle_labels, "l")
screen.onkey(toggle_labels, "L")
screen.onkey(save_drawing, "s")
screen.onkey(save_drawing, "S")
screen.onkey(screen.bye, "Escape")

draw_skeleton()
screen.mainloop()
